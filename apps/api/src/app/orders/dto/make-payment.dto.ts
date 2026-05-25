export class MakePaymentDto {
  reservationId!: string;
  // for testing purposes, to simulate success/failed payment
  forceSuccess?: boolean;
}
