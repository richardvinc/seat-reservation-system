import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatReservationModule } from '../reservation/seat-reservation.module';
import { OrderEntity } from './entities/order.entity';
import { ORDERS_QUEUE_NAME } from './orders.constants';
import { OrdersQueueProcessor } from './orders.queue.processor';
import { OrdersLuaService } from './services/orders-lua.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    BullModule.registerQueue({ name: ORDERS_QUEUE_NAME }),
    SeatReservationModule,
  ],
  providers: [OrdersLuaService, OrdersQueueProcessor],
})
export class OrdersWorkerModule {}
