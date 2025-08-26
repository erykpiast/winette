import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { logger } from '#backend/lib/logger.js';
import { applyRateLimit } from '#backend/lib/rate-limiter.js';
import { renderToPng } from '#backend/lib/renderer.js';
import { LabelDSLSchema } from '#backend/types/label-generation.js';

const RenderRequestSchema = z.object({
  dsl: LabelDSLSchema,
  debug: z.boolean().optional().default(false),
});

async function handleRender(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rateLimitPassed = await applyRateLimit(req, res);
  if (!rateLimitPassed) {
    return;
  }

  try {
    const startTime = Date.now();
    logger.info('Starting label rendering');

    const parseResult = RenderRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.error('Invalid request body', new Error('Validation failed'), {
        details: JSON.stringify(parseResult.error.issues),
      });
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
      return;
    }

    const { dsl, debug } = parseResult.data;

    logger.info('Rendering DSL to PNG', {
      canvasSize: `${dsl.canvas.width}x${dsl.canvas.height}`,
      dpi: dsl.canvas.dpi,
      elements: dsl.elements.length,
      assets: dsl.assets.length,
    });

    const pngBuffer = await renderToPng(dsl, {
      debug,
      timeout: 30000,
    });

    const renderTime = Date.now() - startTime;
    logger.info('Rendering completed', {
      renderTimeMs: renderTime,
      outputSize: pngBuffer.length,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', pngBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Render-Time', renderTime.toString());

    res.status(200).send(pngBuffer);
    return;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Rendering failed', error instanceof Error ? error : new Error(errorMessage));

    res.status(500).json({
      error: 'Rendering failed',
      message: errorMessage,
    });
    return;
  }
}

export default handleRender;
