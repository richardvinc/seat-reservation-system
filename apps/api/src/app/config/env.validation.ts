import * as Joi from 'joi';
import { seatReservationDemoDefaults } from './demo.config';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().port().required(),
  DATABASE_HOST: Joi.string().hostname().required(),
  // DATABASE_PORT: Joi.number().port().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_NAME: Joi.string().required(),
  REDIS_HOST: Joi.string().hostname().required(),
  // REDIS_PORT: Joi.number().port().required(),
  REDIS_USERNAME: Joi.string().allow('').optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_KEY_PREFIX: Joi.string().allow('').default('seat-reservation:'),
  BULLMQ_PREFIX: Joi.string().allow('').default('seat-reservation:bull'),
  NGINX_PORT: Joi.number().port().required(),
  WEB_CONTAINER_NAME: Joi.string().required(),
  API_CONTAINER_NAME: Joi.string().required(),
  POSTGRES_CONTAINER_NAME: Joi.string().required(),
  REDIS_CONTAINER_NAME: Joi.string().required(),
  NGINX_CONTAINER_NAME: Joi.string().required(),
  SEAT_RESERVATION_ID: Joi.string().default(seatReservationDemoDefaults.saleId),
  SEAT_RESERVATION_PRODUCT_NAME: Joi.string().default(
    seatReservationDemoDefaults.productName,
  ),
  SEAT_RESERVATION_TOTAL_STOCK: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.totalStock),
  SEAT_RESERVATION_START_DELAY_SECONDS: Joi.number()
    .integer()
    .min(0)
    .default(seatReservationDemoDefaults.startDelaySeconds),
  SEAT_RESERVATION_DURATION_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.durationSeconds),
  SEAT_RESERVATION_RESERVATION_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.reservationTtlSeconds),
  SEAT_RESERVATION_COOLDOWN_TTL_SECONDS: Joi.number()
    .integer()
    .min(0)
    .default(seatReservationDemoDefaults.cooldownTtlSeconds),
  SEAT_RESERVATION_USER_ATTEMPT_LIMIT: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.userAttemptLimit),
  SEAT_RESERVATION_ATTEMPT_WINDOW_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.attemptWindowSeconds),
  SEAT_RESERVATION_PAYMENT_SUCCESS_RATE: Joi.number()
    .min(0)
    .max(1)
    .default(seatReservationDemoDefaults.paymentSuccessRate),
  JWT_SECRET: Joi.string().min(8).default(seatReservationDemoDefaults.jwtSecret),
  AUTH_SESSION_TTL_DAYS: Joi.number()
    .integer()
    .min(1)
    .default(seatReservationDemoDefaults.authSessionTtlDays),
  AUTH_COOKIE_NAME: Joi.string().default(
    seatReservationDemoDefaults.authCookieName,
  ),
  DEMO_USERS: Joi.string().default(seatReservationDemoDefaults.demoUsers),
});
