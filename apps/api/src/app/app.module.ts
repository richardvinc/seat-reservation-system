import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullMqModule } from '../bullmq/bullmq.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { DemoConfigModule } from './config/demo.config';
import { envValidationSchema } from './config/env.validation';
import { OrdersWorkerModule } from './orders/orders-worker.module';
import { OrdersModule } from './orders/orders.module';
import { SeatReservationModule } from './reservation/seat-reservation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
    }),
    DemoConfigModule,
    BullMqModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    SeatReservationModule,
    OrdersModule,
    OrdersWorkerModule,
  ],
})
export class AppModule {}
