export enum SaleLifecycleStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
}

export enum SeatAvailabilityStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  RESERVED_BY_YOU = 'reserved_by_you',
  PAID = 'paid',
  PAID_BY_YOU = 'paid_by_you',
}

export class SeatStatusDto {
  seatId!: string;
  status!: SeatAvailabilityStatus;
  reservationId!: string | null;
  reservedByCurrentUser!: boolean;
  paidByCurrentUser!: boolean;
  expiresAt!: string | null;
}

export class SeatReservationStatusResponseDto {
  saleId!: string;
  status!: SaleLifecycleStatus;
  totalStock!: number;
  availableSlots!: number;
  seats!: SeatStatusDto[];
  startTime!: string;
  endTime!: string;
}
