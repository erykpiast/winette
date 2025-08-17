import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Minimal CORS utility for Vercel functions
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}

/**
 * Handle CORS preflight requests (OPTIONS). Returns true if the request
 * was handled and response ended, false otherwise.
 */
export function handleCorsPreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).end();
    return true;
  }

  // For non-OPTIONS requests, ensure basic CORS headers are present as well
  setCorsHeaders(res);
  return false;
}
