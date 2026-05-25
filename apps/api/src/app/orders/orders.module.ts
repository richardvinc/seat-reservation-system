import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SeatReservationModule } from '../reservation/seat-reservation.module';
import { OrderEntity } from './entities/order.entity';
import { ORDERS_QUEUE_NAME } from './orders.constants';
import { OrdersController } from './orders.controller';
import { OrdersLuaService } from './services/orders-lua.service';
import { OrdersService } from './services/orders.service';
import { PaymentSimulatorService } from './services/payment-simulator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    BullModule.registerQueue({ name: ORDERS_QUEUE_NAME }),
    AuthModule,
    SeatReservationModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersLuaService, PaymentSimulatorService],
})
export class OrdersModule {}
