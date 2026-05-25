export function createOrdersRedisKeys(saleId: string) {
  const salePrefix = `sale:${saleId}`;

  return {
    reservedUser(username: string): string {
      return `${salePrefix}:user_reservation:${username}`;
    },
    reservedSeat(seatId: string): string {
      return `${salePrefix}:seat_reservation:${seatId}`;
    },
    reservation(reservationId: string): string {
      return `${salePrefix}:reservation:${reservationId}`;
    },
    paidUser(username: string): string {
      return `${salePrefix}:paid:${username}`;
    },
    paidSeat(seatId: string): string {
      return `${salePrefix}:seat_paid:${seatId}`;
    },
    cooldown(username: string): string {
      return `${salePrefix}:cooldown:${username}`;
    },
    buyAttemptsUser(username: string): string {
      return `${salePrefix}:buy_attempts:${username}`;
    },
    reservationExpiries(): string {
      return `${salePrefix}:reservation_expiries`;
    },
    namespace(): string {
      return `${salePrefix}:*`;
    },
  };
}
