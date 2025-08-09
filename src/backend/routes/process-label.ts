import { verifySignature } from '@upstash/qstash/nextjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { generateLabelDescription } from '../services/label-generator.js';
import type { LabelGenerationJob } from '../types/label-generation.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const job = req.body as LabelGenerationJob;

  // Extract attempt count from QStash headers for retry testing
  const attemptCount = parseInt((req.headers['upstash-retried'] as string) || '0') + 1;

  logger.info('Processing label generation job', {
    submissionId: job.submissionId,
    style: job.style,
    attemptCount,
  });

  try {
    // Check if dependencies are available
    if (!supabase) {
      throw new Error('Backend configuration is invalid. Please check environment variables.');
    }

    // Update status to processing
    await supabase
      .from('label_generations')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('submission_id', job.submissionId);

    logger.info('Updated generation status to processing', {
      submissionId: job.submissionId,
    });

    // Generate the label description (with attempt count for testing)
    const labelDescription = await generateLabelDescription(job, attemptCount);

    logger.info('Generated label description', {
      submissionId: job.submissionId,
      style: job.style,
    });

    // Save results
    const { error: updateError } = await supabase
      .from('label_generations')
      .update({
        status: 'completed',
        description: labelDescription,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('submission_id', job.submissionId);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }

    logger.info('Generation completed successfully', {
      submissionId: job.submissionId,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Generation failed', {
      submissionId: job.submissionId,
      error: errorMessage,
      attemptCount,
    });

    // Update status to failed
    if (supabase) {
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
