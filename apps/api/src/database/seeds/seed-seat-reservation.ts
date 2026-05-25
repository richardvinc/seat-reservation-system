import { SeatReservationEntity } from '../../app/reservation/entities/seat-reservation.entity';

type SeatReservationSeedInput = {
  saleId: string;
  productName: string;
  totalStock: number;
  startDelaySeconds: number;
  durationSeconds: number;
};

export function createSeatReservationSeed(
  input: SeatReservationSeedInput,
): Partial<SeatReservationEntity> {
  const now = Date.now();
  const startAt = new Date(now + input.startDelaySeconds * 1000);
  const endAt = new Date(startAt.getTime() + input.durationSeconds * 1000);

  return {
    id: input.saleId,
    productName: input.productName,
    totalStock: input.totalStock,
    startAt,
    endAt,
  };
}
