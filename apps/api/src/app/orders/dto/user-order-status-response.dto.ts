export class UserOrderStatusResponseDto {
  username!: string;
  status!: string;
  message!: string;
  seatId!: string | null;
  reservationId!: string | null;
  expiresAt!: string | null;
}
