local reservedUserKey = KEYS[1]
local reservedSeatKey = KEYS[2]
local reservationKey = KEYS[3]
local paidUserKey = KEYS[4]
local paidSeatKey = KEYS[5]
local cooldownKey = KEYS[6]
local expirySetKey = KEYS[7]

local reservationId = ARGV[1]
local reservationJson = ARGV[2]
local ttlSeconds = tonumber(ARGV[3])
local expiresAtTimestampMs = tonumber(ARGV[4])
local userId = ARGV[5]

if redis.call("EXISTS", paidUserKey) == 1 then
  return "ALREADY_PAID"
end

if redis.call("EXISTS", paidSeatKey) == 1 then
  return "SEAT_ALREADY_PAID"
end

if redis.call("EXISTS", cooldownKey) == 1 then
  return "COOLDOWN_ACTIVE"
end

if redis.call("EXISTS", reservedUserKey) == 1 then
  return "ALREADY_RESERVED"
end

if redis.call("EXISTS", reservedSeatKey) == 1 then
  return "SEAT_ALREADY_RESERVED"
end

redis.call("SET", reservedUserKey, reservationId, "EX", ttlSeconds)
redis.call("SET", reservedSeatKey, reservationId, "EX", ttlSeconds)
redis.call("SET", reservationKey, reservationJson, "EX", ttlSeconds)
redis.call("ZADD", expirySetKey, expiresAtTimestampMs, reservationId)

return "RESERVED"
