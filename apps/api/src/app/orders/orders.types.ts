export interface ReservationRecord {
  username: string;
  seatId: string;
  reservationId: string;
  reservedAt: string;
  expiresAt: string;
}

export interface ReleaseReservationJobData {
  username: string;
  seatId: string;
  reservationId: string;
}

export interface CreatePaidOrderJobData {
  username: string;
  seatId: string;
  reservationId: string;
  paymentReferenceNumber: string;
}
