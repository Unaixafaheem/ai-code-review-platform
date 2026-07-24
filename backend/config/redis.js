const crypto = require('crypto');

let redis = null;
let redisReady = false;
const memoryCache = new Map();

const MEMORY_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TTL_SEC = Number(process.env.CACHE_TTL_SECONDS || 3600);

function getRedis() {
  if (redis !== null) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    redis = false;
    return null;
  }

  try {
    const Redis = require('ioredis');
    redis = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.warn('[redis]', err.message);
      redisReady = false;
    });
    redis.on('ready', () => {
      redisReady = true;
      console.log('[redis] connected');
    });
    redis.connect().catch(() => {
      redisReady = false;
    });
    return redis;
  } catch (err) {
    console.warn('[redis] init failed:', err.message);
    redis = false;
    return null;
  }
}

function cacheKey(parts) {
  const raw = typeof parts === 'string' ? parts : JSON.stringify(parts);
  return `acr:${crypto.createHash('sha256').update(raw).digest('hex')}`;
}

async function cacheGet(key) {
  const client = getRedis();
  if (client && redisReady) {
    try {
      const hit = await client.get(key);
      return hit ? JSON.parse(hit) : null;
    } catch {
      // fall through to memory
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function cacheSet(key, value, ttlSec = DEFAULT_TTL_SEC) {
  const client = getRedis();
  if (client && redisReady) {
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSec);
      return;
    } catch {
      // fall through
    }
  }
  memoryCache.set(key, { value, expires: Date.now() + ttlSec * 1000 });
  // prune occasionally
  if (memoryCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expires < now) memoryCache.delete(k);
    }
  }
}

function isRedisEnabled() {
  return Boolean(process.env.REDIS_URL);
}

function isRedisReady() {
  return redisReady;
}

module.exports = {
  getRedis,
  cacheKey,
  cacheGet,
  cacheSet,
  isRedisEnabled,
  isRedisReady,
  MEMORY_TTL_MS,
  DEFAULT_TTL_SEC,
};
