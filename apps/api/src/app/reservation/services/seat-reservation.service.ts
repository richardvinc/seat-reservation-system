import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createSeatReservationSeed } from '../../../database/seeds/seed-seat-reservation';
import { RedisService } from '../../../redis/redis.service';
import { SeatReservationDemoConfigService } from '../../config/demo.config';
import { createOrdersRedisKeys } from '../../orders/orders.redis-keys';
import {
  SaleLifecycleStatus,
  SeatAvailabilityStatus,
  SeatReservationStatusResponseDto,
  SeatStatusDto,
} from '../dto/seat-reservation-status-response.dto';
import { SeatReservationEntity } from '../entities/seat-reservation.entity';
import { ReservationRecord } from '../../orders/orders.types';

@Injectable()
export class SeatReservationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeatReservationService.name);

  constructor(
    @InjectRepository(SeatReservationEntity)
    private readonly saleRepository: Repository<SeatReservationEntity>,
    private readonly redisService: RedisService,
    private readonly demoConfig: SeatReservationDemoConfigService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.resetRedisState();
    const sale = await this.seedDefaultSale();
  }

  async getCurrentStatus(
    currentUsername: string,
  ): Promise<SeatReservationStatusResponseDto> {
    const sale = await this.getDefaultSaleEntity();
    const redisKeys = createOrdersRedisKeys(this.demoConfig.saleId);
    const redis = this.redisService.getClient();
    const seatIds = this.getSeatIds(sale.totalStock);
    const reservedSeatValues = await redis.mget(
      ...seatIds.map((seatId) => redisKeys.reservedSeat(seatId)),
    );
    const paidSeatValues = await redis.mget(
      ...seatIds.map((seatId) => redisKeys.paidSeat(seatId)),
    );
    const reservationIds = reservedSeatValues.filter(Boolean) as string[];
    const reservationRecordsRaw =
      reservationIds.length > 0
        ? await redis.mget(
            ...reservationIds.map((reservationId) =>
              redisKeys.reservation(reservationId),
            ),
          )
        : [];
    const reservationsById = new Map<string, ReservationRecord>();

    reservationIds.forEach((reservationId, index) => {
      const record = reservationRecordsRaw[index];

      if (record) {
        reservationsById.set(
          reservationId,
          JSON.parse(record) as ReservationRecord,
        );
      }
    });

    const seats = seatIds.map((seatId, index) =>
      this.createSeatStatus({
        seatId,
        currentUsername,
        paidUsername: paidSeatValues[index],
        reservationId: reservedSeatValues[index],
        reservation: reservedSeatValues[index]
          ? reservationsById.get(reservedSeatValues[index]!)
          : undefined,
      }),
    );
    const availableSlots = seats.filter(
      (seat) => seat.status === SeatAvailabilityStatus.AVAILABLE,
    ).length;

    return {
      saleId: this.demoConfig.saleId,
      status: this.getLifecycleStatus(sale.startAt, sale.endAt),
      totalStock: sale.totalStock,
      availableSlots,
      seats,
      startTime: sale.startAt.toISOString(),
      endTime: sale.endAt.toISOString(),
    };
  }

  async getDefaultSaleEntity(): Promise<SeatReservationEntity> {
    const sale = await this.saleRepository.findOneBy({
      id: this.demoConfig.saleId,
    });

    if (!sale) {
      throw new InternalServerErrorException(
        'Seat reservation is not configured in database.',
      );
    }

    return sale;
  }

  getSeatIds(totalStock: number): string[] {
    return Array.from({ length: totalStock }, (_unused, index) =>
      `seat-${index + 1}`,
    );
  }

  /**
   * this is a over-engineered way to make sure everytime we launch this demo project, we purge all keys used that WE use and not just flush everything on redis down the drain. we won't need this on production.
   */
  private async resetRedisState(): Promise<void> {
    const redisKeyPrefix =
      this.configService.get<string>('REDIS_KEY_PREFIX') ?? '';
    const bullPrefix = this.configService.get<string>('BULLMQ_PREFIX') ?? '';

    const deleted = await this.redisService.deleteByPatterns([
      `${redisKeyPrefix}sale:*`,
      `${bullPrefix}:*`,
    ]);

    this.logger.log(`Reset Redis demo state. Deleted ${deleted} keys.`);
  }

  private async seedDefaultSale(): Promise<SeatReservationEntity> {
    const seed = createSeatReservationSeed({
      saleId: this.demoConfig.saleId,
      productName: this.demoConfig.productName,
      totalStock: this.demoConfig.totalStock,
      startDelaySeconds: this.demoConfig.startDelaySeconds,
      durationSeconds: this.demoConfig.durationSeconds,
    });

    await this.saleRepository.upsert(
      {
        id: seed.id!,
        productName: seed.productName!,
        totalStock: seed.totalStock!,
        startAt: seed.startAt!,
        endAt: seed.endAt!,
      },
      ['id'],
    );

    return this.getDefaultSaleEntity();
  }

  private getLifecycleStatus(startAt: Date, endAt: Date): SaleLifecycleStatus {
    const now = Date.now();

    if (now < startAt.getTime()) {
      return SaleLifecycleStatus.UPCOMING;
    }

    if (now > endAt.getTime()) {
      return SaleLifecycleStatus.ENDED;
    }

    return SaleLifecycleStatus.ACTIVE;
  }

  private createSeatStatus({
    seatId,
    currentUsername,
    paidUsername,
    reservationId,
    reservation,
  }: {
    seatId: string;
    currentUsername: string;
    paidUsername: string | null;
    reservationId: string | null;
    reservation?: ReservationRecord;
  }): SeatStatusDto {
    if (paidUsername) {
      return {
        seatId,
        status:
          paidUsername === currentUsername
            ? SeatAvailabilityStatus.PAID_BY_YOU
            : SeatAvailabilityStatus.PAID,
        reservationId: null,
        reservedByCurrentUser: false,
        paidByCurrentUser: paidUsername === currentUsername,
        expiresAt: null,
      };
    }

    if (reservationId && reservation) {
      const reservedByCurrentUser = reservation.username === currentUsername;

      return {
        seatId,
        status: reservedByCurrentUser
          ? SeatAvailabilityStatus.RESERVED_BY_YOU
          : SeatAvailabilityStatus.RESERVED,
        reservationId,
        reservedByCurrentUser,
        paidByCurrentUser: false,
        expiresAt: reservation.expiresAt,
      };
    }

    return {
      seatId,
      status: SeatAvailabilityStatus.AVAILABLE,
      reservationId: null,
      reservedByCurrentUser: false,
      paidByCurrentUser: false,
      expiresAt: null,
    };
  }
}
