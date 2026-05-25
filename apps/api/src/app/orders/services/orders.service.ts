import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { RedisService } from '../../../redis/redis.service';
import { SeatReservationDemoConfigService } from '../../config/demo.config';
import { SeatReservationService } from '../../reservation/services/seat-reservation.service';
import { CreateOrderResponseDto } from '../dto/create-order-response.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MakePaymentDto } from '../dto/make-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { UserOrderStatusResponseDto } from '../dto/user-order-status-response.dto';
import { OrderEntity } from '../entities/order.entity';
import { ORDERS_QUEUE_NAME } from '../orders.constants';
import { createOrdersRedisKeys } from '../orders.redis-keys';
import {
  CreatePaidOrderJobData,
  ReleaseReservationJobData,
  ReservationRecord,
} from '../orders.types';
import { OrdersLuaService } from './orders-lua.service';
import { PaymentSimulatorService } from './payment-simulator.service';

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly redisService: RedisService,
    private readonly saleService: SeatReservationService,
    private readonly ordersLuaService: OrdersLuaService,
    private readonly paymentSimulatorService: PaymentSimulatorService,
    private readonly demoConfig: SeatReservationDemoConfigService,
    @InjectQueue(ORDERS_QUEUE_NAME)
    private readonly ordersQueue: Queue<
      ReleaseReservationJobData | CreatePaidOrderJobData
    >,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.orderRepository.clear();
  }

  async attemptPurchase(
    username: string,
    createOrderDto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    const normalizedUsername = username?.trim();
    const seatId = createOrderDto.seatId?.trim();

    if (!normalizedUsername || !seatId) {
      throw new BadRequestException({
        status: 'invalid_reservation_request',
        message: 'seatId is required.',
      });
    }

    const sale = await this.saleService.getDefaultSaleEntity();
    this.ensureSaleActiveWindowOrThrow(sale.startAt, sale.endAt);
    this.ensureSeatExistsOrThrow(seatId, sale.totalStock);

    const redis = this.redisService.getClient();
    const redisKeys = createOrdersRedisKeys(this.demoConfig.saleId);
    await this.enforceRateLimitOrThrow(
      redis,
      redisKeys.buyAttemptsUser(normalizedUsername),
      this.demoConfig.userAttemptLimit,
    );

    const reservationId = randomUUID();
    const reservedAt = new Date();
    const expiresAt = new Date(
      reservedAt.getTime() + this.demoConfig.reservationTtlMs,
    );
    const reservation: ReservationRecord = {
      username: normalizedUsername,
      seatId,
      reservationId,
      reservedAt: reservedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const result = await redis.eval(
      this.ordersLuaService.getScript('reserve-reservation.lua'),
      7,
      redisKeys.reservedUser(normalizedUsername),
      redisKeys.reservedSeat(seatId),
      redisKeys.reservation(reservationId),
      redisKeys.paidUser(normalizedUsername),
      redisKeys.paidSeat(seatId),
      redisKeys.cooldown(normalizedUsername),
      redisKeys.reservationExpiries(),
      reservationId,
      JSON.stringify(reservation),
      this.demoConfig.reservationTtlSeconds,
      expiresAt.getTime(),
      normalizedUsername,
    );

    if (result !== 'RESERVED') {
      this.throwForReserveResult(String(result));
    }

    await this.ordersQueue.add(
      'release-reservation',
      { username: normalizedUsername, seatId, reservationId },
      {
        delay: this.demoConfig.reservationTtlMs,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        jobId: `release-reservation:${this.demoConfig.saleId}:${reservationId}`,
      },
    );

    return {
      username: normalizedUsername,
      seatId,
      status: 'reserved',
      message: `Seat reserved. Please pay within ${this.formatDuration(this.demoConfig.reservationTtlSeconds)}.`,
      reservationId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getOrderStatus(username: string): Promise<UserOrderStatusResponseDto> {
    const normalizedUsername = username?.trim();

    if (!normalizedUsername) {
      throw new BadRequestException({
        status: 'missing_username',
        message: 'username is required.',
      });
    }

    const redis = this.redisService.getClient();
    const redisKeys = createOrdersRedisKeys(this.demoConfig.saleId);
    const paidSeatId = await redis.get(redisKeys.paidUser(normalizedUsername));

    if (paidSeatId) {
      return {
        username: normalizedUsername,
        status: 'paid',
        message: 'You have successfully reserved a seat.',
        seatId: paidSeatId,
        reservationId: null,
        expiresAt: null,
      };
    }

    const reservationId = await redis.get(
      redisKeys.reservedUser(normalizedUsername),
    );

    if (!reservationId) {
      return {
        username: normalizedUsername,
        status: 'none',
        message: 'You do not have an active reservation or paid order.',
        seatId: null,
        reservationId: null,
        expiresAt: null,
      };
    }

    const reservation = await this.getReservation(redis, reservationId);

    if (!reservation) {
      return {
        username: normalizedUsername,
        status: 'none',
        message: 'Your reservation is no longer active.',
        seatId: null,
        reservationId: null,
        expiresAt: null,
      };
    }

    return {
      username: normalizedUsername,
      status: 'reserved',
      message: 'You have an active reservation.',
      seatId: reservation.seatId,
      reservationId,
      expiresAt: reservation.expiresAt,
    };
  }

  async makePayment(
    username: string,
    makePaymentDto: MakePaymentDto,
  ): Promise<PaymentResponseDto> {
    const normalizedUsername = username?.trim();
    const reservationId = makePaymentDto.reservationId?.trim();

    if (!normalizedUsername || !reservationId) {
      throw new BadRequestException({
        status: 'invalid_payment_request',
        message: 'reservationId is required.',
      });
    }

    const redis = this.redisService.getClient();
    const redisKeys = createOrdersRedisKeys(this.demoConfig.saleId);
    const paidSeatId = await redis.get(redisKeys.paidUser(normalizedUsername));

    if (paidSeatId) {
      throw new ConflictException({
        status: 'already_paid',
        message: 'You have already paid.',
      });
    }

    const currentReservationId = await redis.get(
      redisKeys.reservedUser(normalizedUsername),
    );

    if (!currentReservationId) {
      throw new NotFoundException({
        status: 'no_active_reservation',
        message: 'You do not have an active reservation.',
      });
    }

    if (currentReservationId !== reservationId) {
      throw new ForbiddenException({
        status: 'invalid_reservation',
        message: 'This reservation does not belong to the user.',
      });
    }

    const reservation = await this.getReservation(redis, reservationId);

    if (!reservation) {
      throw new GoneException({
        status: 'reservation_expired',
        message:
          'Your reservation has expired. You can try to attempt buy again.',
      });
    }

    const paymentSucceeded = await this.paymentSimulatorService.process(
      makePaymentDto.forceSuccess,
    );

    if (!paymentSucceeded) {
      return {
        username: normalizedUsername,
        seatId: reservation.seatId,
        status: 'payment_failed',
        reservationId,
        paymentReferenceId: null,
        message:
          'Payment failed. You can retry before your reservation expires.',
      };
    }

    const result = await redis.eval(
      this.ordersLuaService.getScript('mark-paid.lua'),
      6,
      redisKeys.reservedUser(normalizedUsername),
      redisKeys.reservedSeat(reservation.seatId),
      redisKeys.reservation(reservationId),
      redisKeys.paidUser(normalizedUsername),
      redisKeys.paidSeat(reservation.seatId),
      redisKeys.reservationExpiries(),
      reservationId,
      normalizedUsername,
    );

    switch (String(result)) {
      case 'PAID':
        break;
      case 'ALREADY_PAID':
        throw new ConflictException({
          status: 'already_paid',
          message: 'You have already paid.',
        });
      case 'NO_RESERVATION':
        throw new NotFoundException({
          status: 'no_active_reservation',
          message: 'You do not have an active reservation.',
        });
      case 'RESERVATION_MISMATCH':
        throw new ForbiddenException({
          status: 'invalid_reservation',
          message: 'This reservation does not belong to the user.',
        });
      case 'RESERVATION_EXPIRED':
        throw new GoneException({
          status: 'reservation_expired',
          message: 'Your reservation has expired. Please try to buy again.',
        });
      default:
        throw new ConflictException({
          status: 'payment_state_invalid',
          message: `Unexpected payment state: ${String(result)}`,
        });
    }

    const paymentReferenceId = randomUUID();

    await this.ordersQueue.add(
      'create-paid-order',
      {
        username: normalizedUsername,
        seatId: reservation.seatId,
        reservationId,
        paymentReferenceNumber: paymentReferenceId,
      },
      {
        attempts: 10,
        backoff: { type: 'exponential', delay: 1000 },
        jobId: `create-paid-order:${this.demoConfig.saleId}:${normalizedUsername}`,
      },
    );

    return {
      username: normalizedUsername,
      seatId: reservation.seatId,
      status: 'paid',
      reservationId,
      paymentReferenceId,
      message: 'Payment successful.',
    };
  }

  private ensureSaleActiveWindowOrThrow(startAt: Date, endAt: Date): void {
    const now = Date.now();

    if (now < startAt.getTime()) {
      throw new ForbiddenException({
        status: 'sale_not_started',
        message: 'Sale has not started yet.',
      });
    }

    if (now > endAt.getTime()) {
      throw new ForbiddenException({
        status: 'sale_ended',
        message: 'Sale has ended.',
      });
    }
  }

  private ensureSeatExistsOrThrow(seatId: string, totalStock: number): void {
    if (!this.saleService.getSeatIds(totalStock).includes(seatId)) {
      throw new NotFoundException({
        status: 'seat_not_found',
        message: 'Requested seat does not exist.',
      });
    }
  }

  private async enforceRateLimitOrThrow(
    redis: Redis,
    key: string,
    maxAttempts: number,
  ): Promise<void> {
    const attempts = await redis.incr(key);

    if (attempts === 1) {
      await redis.expire(key, this.demoConfig.attemptWindowSeconds);
    }

    if (attempts > maxAttempts) {
      throw new HttpException(
        {
          status: 'too_many_requests',
          message: 'Too many requests. Please try again later.',
        },
        429,
      );
    }
  }

  private async getReservation(
    redis: Redis,
    reservationId: string,
  ): Promise<ReservationRecord | null> {
    const reservationRaw = await redis.get(
      createOrdersRedisKeys(this.demoConfig.saleId).reservation(reservationId),
    );

    if (!reservationRaw) {
      return null;
    }

    return JSON.parse(reservationRaw) as ReservationRecord;
  }

  private throwForReserveResult(result: string): never {
    switch (result) {
      case 'ALREADY_PAID':
        throw new ConflictException({
          status: 'already_paid',
          message: 'You have already purchased a seat.',
        });
      case 'SEAT_ALREADY_PAID':
        throw new ConflictException({
          status: 'seat_unavailable',
          message: 'This seat has already been paid for.',
        });
      case 'ALREADY_RESERVED':
        throw new ConflictException({
          status: 'already_reserved',
          message: 'You already have an active reservation.',
        });
      case 'SEAT_ALREADY_RESERVED':
        throw new ConflictException({
          status: 'seat_unavailable',
          message: 'This seat is currently reserved by another user.',
        });
      case 'COOLDOWN_ACTIVE':
        throw new HttpException(
          {
            status: 'cooldown_active',
            message:
              'You recently let a reservation expire. Please try again later.',
          },
          429,
        );
      default:
        throw new ConflictException({
          status: 'reservation_failed',
          message: `Unexpected reservation state: ${result}`,
        });
    }
  }

  private formatDuration(durationSeconds: number): string {
    if (durationSeconds % 60 === 0) {
      const minutes = durationSeconds / 60;
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    return `${durationSeconds} second${durationSeconds === 1 ? '' : 's'}`;
  }
}
