import { Client } from '@upstash/qstash';
import { runLabelOrchestrator } from '../services/label-generator.js';
import type { LabelGenerationJob } from '../types/label-generation.js';
import { config } from './config.js';
import { supabase } from './database.js';
import { logger } from './logger.js';

export const qstash = new Client({
  token: config.QSTASH_TOKEN || '',
});

/**
 * Check if we're in development mode and API_BASE_URL points to localhost
 */
function isDevelopmentMode(): boolean {
  return (
    config.NODE_ENV === 'development' &&
    (config.API_BASE_URL?.includes('localhost') ||
      config.API_BASE_URL?.includes('127.0.0.1') ||
      config.API_BASE_URL?.includes('::1'))
  );
}

/**
 * Process job directly in development mode to bypass QStash loopback restrictions
 */
async function processJobDirectly(job: LabelGenerationJob): Promise<string> {
  const jobId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  logger.info('Processing job directly in development mode', {
    submissionId: job.submissionId,
    jobId,
  });

  // Process asynchronously but don't await to maintain queue-like behavior
  setImmediate(async () => {
    try {
      // Check if supabase client is available
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Resolve generation id
      const { data: gen } = await supabase
        .from('label_generations')
        .select('id')
        .eq('submission_id', job.submissionId)
        .single();

      if (!gen?.id) throw new Error('Generation not found for submission');

      await runLabelOrchestrator({ generationId: gen.id, job });

      logger.info('Development job completed successfully', {
        submissionId: job.submissionId,
        jobId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Development job failed', {
        submissionId: job.submissionId,
        jobId,
        error: errorMessage,
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
    }
  });

  return jobId;
}

export async function queueLabelGeneration(job: LabelGenerationJob): Promise<string> {
  // In development mode with localhost URLs, process directly to avoid QStash loopback restrictions
  if (isDevelopmentMode()) {
    logger.info('Development mode detected, processing job directly', {
      submissionId: job.submissionId,
      apiBaseUrl: config.API_BASE_URL,
    });
    return processJobDirectly(job);
  }

  // Production mode: use QStash
  // Validate configuration explicitly to surface clear error messages
  if (!config.QSTASH_TOKEN) {
    logger.error('QStash token is missing. Cannot publish job to QStash.', undefined, {
      operation: 'queueLabelGeneration',
    });
    throw new Error('QStash token missing');
  }
  if (
    !config.API_BASE_URL ||
    config.API_BASE_URL.includes('localhost') ||
    config.API_BASE_URL.includes('127.0.0.1') ||
    config.API_BASE_URL.includes('::1')
  ) {
    logger.error('Invalid API_BASE_URL for QStash delivery', undefined, {
      operation: 'queueLabelGeneration',
      apiBaseUrl: config.API_BASE_URL,
    });
    throw new Error('Invalid API_BASE_URL for QStash');
  }

  // Resolve generation id for dedup header
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  const { data: gen } = await supabase
    .from('label_generations')
    .select('id')
    .eq('submission_id', job.submissionId)
    .single();

  try {
    const queue = qstash.queue({ queueName: 'label-generation' });
    const response = await queue.enqueueJSON({
      url: `${config.API_BASE_URL}/api/process-label`,
      body: { ...job, generationId: gen?.id },
      retries: 3,
      timeout: '30s',
      headers: {
        'Content-Type': 'application/json',
        ...(gen?.id ? { 'Upstash-Deduplication-Id': gen.id } : {}),
      },
    });

    return response.messageId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown QStash publish error';
    logger.error('QStash publish failed', error, {
      operation: 'queueLabelGeneration',
      submissionId: job.submissionId,
      apiBaseUrl: config.API_BASE_URL,
    });
    throw new Error(errorMessage);
  }
}

export type { LabelGenerationJob };
