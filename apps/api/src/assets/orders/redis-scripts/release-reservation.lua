local reservedUserKey = KEYS[1]
local reservedSeatKey = KEYS[2]
local reservationKey = KEYS[3]
local paidUserKey = KEYS[4]
local paidSeatKey = KEYS[5]
local expirySetKey = KEYS[6]
local cooldownKey = KEYS[7]

local reservationId = ARGV[1]
local userId = ARGV[2]
local cooldownSeconds = tonumber(ARGV[3])

if redis.call("EXISTS", paidUserKey) == 1 or redis.call("EXISTS", paidSeatKey) == 1 then
  redis.call("ZREM", expirySetKey, reservationId)
  return "ALREADY_PAID"
end

local currentUserReservationId = redis.call("GET", reservedUserKey)
local currentSeatReservationId = redis.call("GET", reservedSeatKey)

if not currentUserReservationId or not currentSeatReservationId then
  local removedExpiry = redis.call("ZREM", expirySetKey, reservationId)

  if removedExpiry == 1 then
    redis.call("SET", cooldownKey, "1", "EX", cooldownSeconds)
    return "RELEASED_EXPIRED"
  end

  return "NO_RESERVATION"
end

if currentUserReservationId ~= reservationId or currentSeatReservationId ~= reservationId then
  return "RESERVATION_MISMATCH"
end

redis.call("DEL", reservedUserKey)
redis.call("DEL", reservedSeatKey)
redis.call("DEL", reservationKey)
redis.call("ZREM", expirySetKey, reservationId)
redis.call("SET", cooldownKey, "1", "EX", cooldownSeconds)

return "RELEASED"
