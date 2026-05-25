export class PaymentResponseDto {
  username!: string;
  seatId!: string;
  status!: string;
  reservationId!: string | null;
  paymentReferenceId!: string | null;
  message!: string;
}
