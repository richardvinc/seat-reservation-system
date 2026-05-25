import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SeatReservationEntity } from './entities/seat-reservation.entity';
import { SeatReservationController } from './seat-reservation.controller';
import { SeatReservationService } from './services/seat-reservation.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeatReservationEntity]), AuthModule],
  controllers: [SeatReservationController],
  providers: [SeatReservationService],
  exports: [SeatReservationService],
})
export class SeatReservationModule {}
