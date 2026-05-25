# Seat Reservation System

## About The Project

This project is to simulate seat reservation situtation, where we have limited seats and a huge number of users. This project supposed to be simple, not production-ready, only simulate a different approach that can be taken to prevent abuse on the backend itself. To simplify authentication, this app use JWT-approach with http-only cookie. Each user can only reserve one seat.

Caveat when running application: This application is designed for demo-purposes, so in order to get consistent result, the system will **wipe `orders` data + reset `seat reservation` data on database and wipe all redis key used in this project (prefixed with `seat-reservation:`) on every application start**. No, this doesn't mean running this app will wipe all your databases and redis key other than that is used by this application.

## System Diagram

This is the current system diagram for this project.

![System diagram](/attachments/diagram.png)

Here are the explanation for each components:

### NGINX

NGINX is routing all requests to frontend (`/` route) or backend (`/api` route).

### Frontend

Frontend is a simple React application using Next.js framework with Tailwind for styling. I intentionally not applying any logic to enable/disable any button and show the error as-is from the backend since I want to show how backend handle every action from the user (for example, attempting to reserve seat more than once).

### Backend

Backend interacts with 3 other components: PostgreSQL as database, Redis as caching system, and BullMQ as worker queue. Most of the parameter used by backend service is exposed to environment variable via `.env` file. You can take a look at the function of every variable by looking at `.env.example` file.

Backend exposes six endpoints:

| Method | Path                           | Purpose                                                                | Request body / query                             |
| ------ | ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `POST` | `/api/auth/login`              | Sign in and create a long-lived JWT session cookie                     | JSON: `{ "username": "...", "password": "..." }` |
| `POST` | `/api/auth/logout`             | Clear the current session cookie                                       | None                                             |
| `GET`  | `/api/auth/me`                 | Return the authenticated session user                                  | None                                             |
| `GET`  | `/api/seat-reservation/status` | Return sale lifecycle, live seat availability, and time window         | None                                             |
| `POST` | `/api/reservations/reserve`    | Reserve a specific seat for the authenticated user                     | JSON: `{ "seatId": "seat-1" }`                   |
| `POST` | `/api/reservations/pay`        | Complete payment for the authenticated user's active reservation       | JSON: `{ "reservationId": "..." }`               |
| `GET`  | `/api/reservations/status`     | Return whether the authenticated user is `none`, `reserved`, or `paid` | None                                             |

### Redis

Since we are dealing with a huge number of users, I design the application to use reservations to manage race conditions. We manage the reservations, seat availability, user buy-attempt (for rate-limit), and user cooldown on Redis. I choose this because it is fast and we can run atomic operation to make sure that we only create paid-order job when all requirements are fullfiled (user has never bought the item, user has an active reservation, and user has already made payment).

### Worker Queue

We utilize queue (we use BullMQ on Nest.JS since we are dealing with Node.js only application for now and Nest.JS supports it out of the box) to release user's reservation and to persist order to the database. We use `upsert` when inserting order data to dabase, since the job will retry if DB fails to write the data.
**Production scenario**: In the production scenario, we should separate this worker into its own service so it doesn't overwhelm the main service.

### Database

We use postgres to store the seat reservation and orders data. Since we want to prevent over-ordering problem and hold the source-of-truth of user orders in this database, we applied some heavy prevention for it by managing the stock-keeping on Redis and use worker queue to write order.

## Design Choices & Trade-Offs

This part is based on this application running on Docker using docker compose. Local development might have different outcome, since we use local Redis and PostgreSQL.

NGINX acts as the single public entrypoint and reverse proxy, simulating a simplified edge layer similar to an ingress, API gateway, or load balancer with path-based routing. This doesn't really simulate one-to-one for load balancing, since current approach only register one upstream API via:

```bash
upstream api {
    server api:3100;
}
```

We can further simulate load-balancer if we list multiple API server, like:

```bash
upstream api {
    server api:3100;
    server api:3200;
}
```

But this means that we will have multiple containers of API service, which we are currently not implementing.

Since Redis manages all available reservation slots, user reservations, user buy attempts, and user purchases, Redis feels like the biggest contributor of this project. The trade-off is, Redis failure will make backend return 500 error to every endpoints. We did apply AOF (append-only-file), so when Redis is back online, the data is reserved. In production scenario, using replication for Redis is a primary requirement.

**Production scenario**: For production scenario, we should utilize distributed redis/redis sentinel, so when one instance goes down, the other can still serve.

If for some reason, database is failing before persisting orders data from queue, the queue will retry the job up to 10 times with a exponential delay in-between.

## Build & Run Instructions

All of the solution is running on the same docker compose stack, consisting of several container (further explanation on design choices and trade-offs). You can also manually run every service on it's own to inspect everything. When application is running on docker compose, I intentionally expose redis's and postgresql's port so you can inspect the data without having to execute command inside the container itself.

### Pre-requisite

Duplicate `.env.example` file and rename it as `.env`. You can tweak the value according to your needs.

#### Running on Docker

This is the most straightfroward way to run this application with its all dependencies. Make sure you have Docker installed and running.

Docker compose will read `.env`, so make sure you already tweak the parameters if needed.

1. To build and run the application, run `docker compose up --build` inside the project's root folder. This will download all image needed, build `api`, `web`, and `worker` and run all containers accordingly.
2. Open `http://localhost:88` (or other port defined in `NGINX_PORT`) to run the application.

#### Running locally

Make sure you have local Redis running on port 6379 and local PostgreSQL running on port 5432 before proceed. If you have them running on different ports, you can either change the port for database in `\apps\api\src\database\database.module.ts` and for Redis in `apps\api\src\redis\redis.module.ts`. We hardcoded this value for simplicity since it is intended to run on Docker. The `REDIS_PORT` and `DATABASE_PORT` in `.env` file is for exposing db and redis to outside Docker.

1. Run `pnpm install` in the root of project directory to install dependencies. If you don't have PNPM, [see here](https://pnpm.io/installation).

2. To run backend service, run `pnpm nx serve api`.

3. To run frontend service, run `pnpm nx dev web` in a different terminal.

4. Open application on `http://localhost:3000`

## More Ideal Scenario

Having some kind of firewall in front of NGINX would be ideal, since it can filter-out malicious request/bot that will hit NGINX. Simulating it via Docker is pretty straightforward via `owasp/modsecurity-crs` image, although not really ideal for this scenario.
