import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit } from './cache.js';
import { config } from './config.js';

/**
 * Extract IP address from Vercel request
 * @param req - The Vercel request object
 * @returns The client IP address
 */
function getClientIp(req: VercelRequest): string {
  // Check various headers for the real IP address
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (typeof forwarded === 'string') {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwarded.split(',');
    if (ips.length > 0 && ips[0]) {
      const firstIp = ips[0].trim();
      if (firstIp) {
        return firstIp;
      }
    }
  }

  if (typeof realIp === 'string') {
    return realIp;
  }

  if (typeof cfConnectingIp === 'string') {
    return cfConnectingIp;
  }

  // Fallback to connection remote address
  return req.socket?.remoteAddress ?? '127.0.0.1';
}

/**
 * Apply rate limiting to a Vercel API handler
 * @param req - The Vercel request object
 * @param res - The Vercel response object
 * @returns True if the request is allowed, false if rate limited
 */
export async function applyRateLimit(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  // Skip rate limiting entirely if disabled
  if (config.DISABLE_RATE_LIMITING) {
    return true;
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(clientIp);

  // Add rate limit headers to the response
  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitResult.limit - rateLimitResult.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString());

  if (!rateLimitResult.allowed) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(rateLimitResult.windowMs / 1000),
    });
    return false;
  }

  return true;
}
