export class CreateOrderResponseDto {
  username!: string;
  seatId!: string;
  status!: string;
  message!: string;
  reservationId!: string | null;
  expiresAt!: string | null;
}
