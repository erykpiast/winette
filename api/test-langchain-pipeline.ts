// Production test endpoint for LangChain pipeline
// GET /api/test-langchain-pipeline

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runImageGenerate } from '../src/backend/lib/langchain-chains/index.js';
import { autoConfigurePipeline } from '../src/backend/lib/production-config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Strict security: Never expose debug endpoints in production
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEBUG_ENDPOINTS) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Require authentication for staging/development
  const debugToken = req.headers['x-debug-token'];
  if (!debugToken || debugToken !== process.env.DEBUG_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Auto-configure for production
    autoConfigurePipeline();

    // Test with a simple image generation
    const testInput = {
      id: 'test-prod',
      purpose: 'background' as const,
      prompt: 'Elegant wine vineyard landscape, golden hour lighting',
      aspect: '3:2' as const,
      negativePrompt: 'harsh lighting',
      guidance: 7.0,
    };

    const result = await runImageGenerate(testInput);

    res.status(200).json({
      message: 'LangChain pipeline is configured and working',
      environment: process.env.NODE_ENV,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline test error:', error);
    res.status(500).json({
      error: 'Pipeline configuration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
