// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    // Only log in non-test environments
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] Connection error:", err.message);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Distributed lock helper using SET NX EX (atomic)
export async function acquireLock(
  key: string,
  ttlSeconds = 10
): Promise<string | null> {
  const lockToken = `${Date.now()}-${Math.random()}`;
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, lockToken, "EX", ttlSeconds, "NX");
  return result === "OK" ? lockToken : null;
}

export async function releaseLock(
  key: string,
  token: string
): Promise<boolean> {
  // Lua script ensures we only delete our own lock (atomic check-and-delete)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const lockKey = `lock:${key}`;
  const result = await redis.eval(script, 1, lockKey, token);
  return result === 1;
}
