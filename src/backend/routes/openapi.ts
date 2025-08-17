import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreflight } from '../lib/cors.js';
import { applyRateLimit } from '../lib/rate-limiter.js';
import openapi from '../schema/openapi.json';

/**
 * OpenAPI schema handler with rate limiting
 */
export async function handleOpenApiSchema(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCorsPreflight(req, res)) return;
  // Apply rate limiting
  const isAllowed = await applyRateLimit(req, res);
  if (!isAllowed) {
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are allowed for this endpoint',
    });
    return;
  }

  res.json(openapi);
}
