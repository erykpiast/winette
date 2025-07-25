import type { NextFunction, Request, Response } from 'express';
import { CacheService } from '../lib/cache.js';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Create a rate limiter middleware using Upstash Redis
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get client IP address
      const ip =
        req.ip ||
        req.connection.remoteAddress ||
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        'unknown';

      const clientIP = Array.isArray(ip) ? ip[0] || 'unknown' : String(ip);

      // Get current count for this IP
      const currentCount = await CacheService.getRateLimitCount(clientIP);

      // Check if limit exceeded
      if (currentCount >= max) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      // Continue with request
      next();

      // Increment count after successful response (if not skipping)
      if (!skipSuccessfulRequests) {
        res.on('finish', async () => {
          if (res.statusCode < 400) {
            await CacheService.incrementRateLimit(clientIP, windowMs);
          }
        });
      } else {
        // Always increment for this implementation
        await CacheService.incrementRateLimit(clientIP, windowMs);
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request to continue
      next();
    }
  };
}

// Default rate limiter for the entire API
export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later.',
});

// Stricter rate limiter for API endpoints
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: 'API rate limit exceeded. Please slow down your requests.',
});
