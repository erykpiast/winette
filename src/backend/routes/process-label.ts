import { verifySignature } from '@upstash/qstash/nextjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreflight } from '../lib/cors.js';
import { supabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { runLabelOrchestrator } from '../services/label-generator.js';
import type { LabelGenerationJob } from '../types/label-generation.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (handleCorsPreflight(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const job = req.body as LabelGenerationJob & { generationId?: string; idempotencyKey?: string };

  // Extract attempt count from QStash headers for retry testing
  const attemptCount = parseInt((req.headers['upstash-retried'] as string) || '0') + 1;

  logger.info('Processing label generation job', {
    submissionId: job.submissionId,
    style: job.style,
    attemptCount,
  });

  try {
    if (!supabase) throw new Error('Backend configuration is invalid. Please check environment variables.');

    // Resolve the generationId from submission
    const { data: generation } = await supabase
      .from('label_generations')
      .select('id')
      .eq('submission_id', job.submissionId)
      .single();

    const generationId = job.generationId || generation?.id;
    if (!generationId) throw new Error('Missing generationId');

    await runLabelOrchestrator({ generationId, job });

    return res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Generation failed', {
      submissionId: job.submissionId,
      error: errorMessage,
      attemptCount,
    });

    // Update status to failed
    if (supabase && job?.submissionId) {
      await supabase
        .from('label_generations')
        .update({
          status: 'failed',
          error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('submission_id', job.submissionId);
    }

    // Return 500 to trigger QStash retry
    return res.status(500).json({
      error: 'Processing failed',
      message: errorMessage,
    });
  }
};

/**
 * Process label generation worker endpoint with QStash signature verification
 * @param req - Vercel request object
 * @param res - Vercel response object
 */
export const handleProcessLabel = verifySignature(handler);
