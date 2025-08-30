import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Debug endpoint to check environment configuration
 * Remove this endpoint after debugging
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Strict security: Never expose debug info in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Only allow in local development
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const requiredVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LANGCHAIN_DEFAULT_MODEL'];

  const envCheck = requiredVars.reduce(
    (acc, varName) => {
      const value = process.env[varName];
      acc[varName] = {
        exists: !!value,
        length: value?.length || 0,
        prefix: value?.substring(0, 8) || 'missing',
        format: varName === 'OPENAI_API_KEY' ? (value ? /^sk-[A-Za-z0-9]{40,}$/.test(value) : false) : 'not-checked',
      };
      return acc;
    },
    {} as Record<string, { exists: boolean; length: number; prefix: string; format: boolean | string }>,
  );

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    apiKeys: envCheck,
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    },
  };

  res.setHeader('Cache-Control', 'no-store');
  res.json(diagnostics);
  return;
}
