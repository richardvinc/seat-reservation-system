import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoUser } from '../auth/auth.types';

export const seatReservationDemoDefaults = {
  saleId: 'main',
  productName: 'Limited Edition Product',
  totalStock: 3,
  // how many second we should wait after running app before reservation begins -> default 10 seconds
  startDelaySeconds: 10,

  // how long reservation will open -> default 10 minutes
  durationSeconds: 10 * 60,

  // how long reservation is for each user (time for user to make payment) -> default 5 minutes
  reservationTtlSeconds: 5 * 60,

  // if user is on cooldown after repeatedly hitting the reservation endpoint, how long should they wait -> default 1 minute
  cooldownTtlSeconds: 60,

  // maximum user attempt to trigger cooldown
  userAttemptLimit: 3,

  // duration to count repeated user attempt before counted as too many attempts -> default to 1 minute
  attemptWindowSeconds: 60,

  // payment outcome success rate when no explicit override is passed
  paymentSuccessRate: 0.7,

  jwtSecret: 'seat-reservation-demo-secret',
  authSessionTtlDays: 90,
  authCookieName: 'seat_reservation_session',
  demoUsers:
    'alice:password123,bob:password123,carol:password123,dave:password123',
} as const;

@Injectable()
export class SeatReservationDemoConfigService {
  constructor(private readonly configService: ConfigService) {}

  get saleId(): string {
    return this.configService.get<string>(
      'SEAT_RESERVATION_ID',
      seatReservationDemoDefaults.saleId,
    );
  }

  get productName(): string {
    return this.configService.get<string>(
      'SEAT_RESERVATION_PRODUCT_NAME',
      seatReservationDemoDefaults.productName,
    );
  }

  get totalStock(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_TOTAL_STOCK',
      seatReservationDemoDefaults.totalStock,
    );
  }

  get startDelaySeconds(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_START_DELAY_SECONDS',
      seatReservationDemoDefaults.startDelaySeconds,
    );
  }

  get durationSeconds(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_DURATION_SECONDS',
      seatReservationDemoDefaults.durationSeconds,
    );
  }

  get reservationTtlSeconds(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_RESERVATION_TTL_SECONDS',
      seatReservationDemoDefaults.reservationTtlSeconds,
    );
  }

  get reservationTtlMs(): number {
    return this.reservationTtlSeconds * 1000;
  }

  get cooldownTtlSeconds(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_COOLDOWN_TTL_SECONDS',
      seatReservationDemoDefaults.cooldownTtlSeconds,
    );
  }

  get userAttemptLimit(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_USER_ATTEMPT_LIMIT',
      seatReservationDemoDefaults.userAttemptLimit,
    );
  }

  get attemptWindowSeconds(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_ATTEMPT_WINDOW_SECONDS',
      seatReservationDemoDefaults.attemptWindowSeconds,
    );
  }

  get paymentSuccessRate(): number {
    return this.configService.get<number>(
      'SEAT_RESERVATION_PAYMENT_SUCCESS_RATE',
      seatReservationDemoDefaults.paymentSuccessRate,
    );
  }

  get jwtSecret(): string {
    return this.configService.get<string>(
      'JWT_SECRET',
      seatReservationDemoDefaults.jwtSecret,
    );
  }

  get authSessionTtlDays(): number {
    return this.configService.get<number>(
      'AUTH_SESSION_TTL_DAYS',
      seatReservationDemoDefaults.authSessionTtlDays,
    );
  }

  get authCookieName(): string {
    return this.configService.get<string>(
      'AUTH_COOKIE_NAME',
      seatReservationDemoDefaults.authCookieName,
    );
  }

  get demoUsers(): DemoUser[] {
    const raw = this.configService.get<string>(
      'DEMO_USERS',
      seatReservationDemoDefaults.demoUsers,
    );

    return raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const separatorIndex = pair.indexOf(':');
        const username = pair.slice(0, separatorIndex).trim();
        const password = pair.slice(separatorIndex + 1).trim();

        return { username, password };
      })
      .filter((user) => user.username && user.password);
  }
}

@Global()
@Module({
  providers: [SeatReservationDemoConfigService],
  exports: [SeatReservationDemoConfigService],
})
export class DemoConfigModule {}
