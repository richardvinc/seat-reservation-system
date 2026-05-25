local reservedUserKey = KEYS[1]
local reservedSeatKey = KEYS[2]
local reservationKey = KEYS[3]
local paidUserKey = KEYS[4]
local paidSeatKey = KEYS[5]
local expirySetKey = KEYS[6]

local reservationId = ARGV[1]
local userId = ARGV[2]

if redis.call("EXISTS", paidUserKey) == 1 or redis.call("EXISTS", paidSeatKey) == 1 then
  return "ALREADY_PAID"
end

local currentUserReservationId = redis.call("GET", reservedUserKey)
local currentSeatReservationId = redis.call("GET", reservedSeatKey)

if not currentUserReservationId or not currentSeatReservationId then
  return "NO_RESERVATION"
end

if currentUserReservationId ~= reservationId or currentSeatReservationId ~= reservationId then
  return "RESERVATION_MISMATCH"
end

local reservationJson = redis.call("GET", reservationKey)

if not reservationJson then
  return "RESERVATION_EXPIRED"
end

local reservation = cjson.decode(reservationJson)

redis.call("SET", paidUserKey, reservation.seatId)
redis.call("SET", paidSeatKey, userId)
redis.call("DEL", reservedUserKey)
redis.call("DEL", reservedSeatKey)
redis.call("DEL", reservationKey)
redis.call("ZREM", expirySetKey, reservationId)

return "PAID"
