import { Redis } from '@upstash/redis';
import { config } from './config.js';
import { logger } from './logger.js';

// Check if Redis configuration is available
const isRedisAvailable = !!(config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN);

// Create Upstash Redis client with aggressive timeouts for local development
export const redis = isRedisAvailable
  ? new Redis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN,
      // Configure for fast failure in local development
      retry: {
        retries: 0, // No retries for faster failure
      },
    })
  : null;

/**
 * Get the current request count for an IP address
 */
export async function getRateLimitCount(ip: string): Promise<number> {
  // Fail open immediately if Redis is not available
  if (!redis) {
    return 0;
  }

  try {
    const key = `rate_limit:${ip}`;

    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 300);
    });

    const count = await Promise.race([redis.get(key), timeoutPromise]);

    if (count === null || count === undefined) {
      return 0;
    }

    // Handle different data types from Redis
    if (typeof count === 'number') {
      return count;
    }

    const numCount = Number(count);
    return Number.isNaN(numCount) ? 0 : numCount;
  } catch (error) {
    logger.error('Redis get error:', error, {
      operation: 'getRateLimitCount',
      ip,
    });
    return 0; // Fail open for rate limiting
  }
}

/**
 * Increment the request count for an IP address
 */
export async function incrementRateLimit(ip: string, windowMs: number): Promise<number> {
  // Fail open immediately if Redis is not available
  if (!redis) {
    return 0;
  }

  try {
    const key = `rate_limit:${ip}`;

    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 300);
    });

    // Use direct operations instead of pipeline for simplicity and speed
    const incrPromise = redis.incr(key);
    const count = await Promise.race([incrPromise, timeoutPromise]);

    // Set expiration (fire and forget - don't wait for this)
    redis.expire(key, Math.ceil(windowMs / 1000)).catch((error) => {
      logger.error('Redis expire error (non-blocking):', error, {
        operation: 'incrementRateLimit',
        ip,
        windowMs,
      });
    });

    return typeof count === 'number' ? count : Number(count) || 0;
  } catch (error) {
    logger.error('Redis increment error:', error, {
      operation: 'incrementRateLimit',
      ip,
      windowMs,
    });
    return 0; // Fail open for rate limiting
  }
}

/**
 * Cache a value with expiration
 */
export async function cacheSet(key: string, value: unknown, expirationSeconds?: number): Promise<void> {
  if (!redis) {
    return; // Silently fail if Redis is not available
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 300);
    });

    if (expirationSeconds) {
      await Promise.race([redis.setex(key, expirationSeconds, JSON.stringify(value)), timeoutPromise]);
    } else {
      await Promise.race([redis.set(key, JSON.stringify(value)), timeoutPromise]);
    }
  } catch (error) {
    logger.error('Redis set error:', error, {
      operation: 'cacheSet',
      key,
      expirationSeconds,
    });
  }
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) {
    return null; // Return null if Redis is not available
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 300);
    });

    const value = await Promise.race([redis.get(key), timeoutPromise]);
    if (!value) {
      return null;
    }

    // Handle case where Redis returns different data types
    if (typeof value === 'string') {
      return JSON.parse(value);
    } else if (typeof value === 'object') {
      // If Redis returns an object directly, return it as-is
      return value as T;
    } else {
      // For other types, try to parse as string
      return JSON.parse(String(value));
    }
  } catch (error) {
    logger.error('Redis get error:', error, { operation: 'cacheGet', key });
    return null;
  }
}

/**
 * Delete a cached value
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) {
    return; // Silently fail if Redis is not available
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 300);
    });

    await Promise.race([redis.del(key), timeoutPromise]);
  } catch (error) {
    logger.error('Redis delete error:', error, {
      operation: 'cacheDelete',
      key,
    });
  }
}

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // requests per window
};

/**
 * Check and apply rate limiting for an IP address
 * @param ip - The IP address to check
 * @returns Object with allowed status and current count
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  windowMs: number;
  resetTime: Date;
}> {
  const currentCount = await getRateLimitCount(ip);

  if (currentCount >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      count: currentCount,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      windowMs: RATE_LIMIT_CONFIG.windowMs,
      resetTime: new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs),
    };
  }

  const newCount = await incrementRateLimit(ip, RATE_LIMIT_CONFIG.windowMs);

  return {
    allowed: true,
    count: newCount,
    limit: RATE_LIMIT_CONFIG.maxRequests,
    windowMs: RATE_LIMIT_CONFIG.windowMs,
    resetTime: new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs),
  };
}

/**
 * Test Redis connection
 */
export async function testConnection(): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis is not configured');
    return false;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 1000);
    });

    await Promise.race([redis.ping(), timeoutPromise]);
    logger.info('Redis connection verified');
    return true;
  } catch (error) {
    logger.error('Redis connection failed:', error, {
      operation: 'testConnection',
    });
    return false;
  }
}
