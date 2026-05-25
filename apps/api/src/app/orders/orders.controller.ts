import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResponseDto } from './dto/create-order-response.dto';
import { MakePaymentDto } from './dto/make-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { UserOrderStatusResponseDto } from './dto/user-order-status-response.dto';
import { OrdersService } from './services/orders.service';

@Controller('reservations')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('reserve')
  async attemptPurchase(
    @CurrentUser() user: AuthUser,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    return this.ordersService.attemptPurchase(user.username, createOrderDto);
  }

  @Get('status')
  async getOrderStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<UserOrderStatusResponseDto> {
    return this.ordersService.getOrderStatus(user.username);
  }

  @Post('pay')
  async makePayment(
    @CurrentUser() user: AuthUser,
    @Body() makePaymentDto: MakePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.ordersService.makePayment(user.username, makePaymentDto);
  }
}
