import { Redis } from '@upstash/redis';
import { config } from './config.js';

// Create Upstash Redis client
export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Cache utilities for rate limiting and general caching
 */
export class CacheService {
  /**
   * Get the current request count for an IP address
   */
  static async getRateLimitCount(ip: string): Promise<number> {
    try {
      const key = `rate_limit:${ip}`;
      const count = await redis.get(key);
      return count ? Number(count) : 0;
    } catch (error) {
      console.error('Redis get error:', error);
      return 0; // Fail open for rate limiting
    }
  }

  /**
   * Increment the request count for an IP address
   */
  static async incrementRateLimit(ip: string, windowMs: number): Promise<number> {
    try {
      const key = `rate_limit:${ip}`;
      const pipeline = redis.pipeline();

      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      return results[0] as number;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0; // Fail open for rate limiting
    }
  }

  /**
   * Cache a value with expiration
   */
  static async set(key: string, value: unknown, expirationSeconds?: number): Promise<void> {
    try {
      if (expirationSeconds) {
        await redis.setex(key, expirationSeconds, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Get a cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value as string) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Delete a cached value
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await redis.ping();
      console.log('✅ Redis connection verified');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      return false;
    }
  }
}
