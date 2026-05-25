import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { SeatReservationStatusResponseDto } from './dto/seat-reservation-status-response.dto';
import { SeatReservationService } from './services/seat-reservation.service';

@Controller('seat-reservation')
export class SeatReservationController {
  constructor(private readonly saleService: SeatReservationService) {}

  @UseGuards(AuthGuard)
  @Get('status')
  async getCurrentStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<SeatReservationStatusResponseDto> {
    return this.saleService.getCurrentStatus(user.username);
  }
}
