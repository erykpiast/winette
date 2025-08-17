import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { handleCorsPreflight } from '../lib/cors.js';
import { supabase, type WineLabel } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { queueLabelGeneration } from '../lib/queue.js';
import { applyRateLimit } from '../lib/rate-limiter.js';
import type { LabelStyleId, SubmitWineLabelResponse } from '../types/label-generation.js';
import { isValidLabelStyle } from '../types/label-generation.js';

// Simple API error class for Vercel functions
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiError(message: string, statusCode: number, code: string): ApiError {
  const error = new ApiError(message, statusCode, code);
  // Report API errors to NewRelic with additional context
  logger.reportError(error, {
    statusCode,
    code,
    errorType: 'ApiError',
  });
  return error;
}

// Zod schemas for validation
const WineStyleSchema = z.enum(['red', 'white', 'rosé', 'sparkling', 'dessert']);

const GetWineLabelsQuerySchema = z.object({
  style: WineStyleSchema.optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// Schema for wine label submissions
const SubmitWineLabelSchema = z.object({
  producerName: z.string().min(1).max(200),
  wineName: z.string().min(1).max(200),
  vintage: z.string().min(4).max(10),
  variety: z.string().min(1).max(200),
  region: z.string().min(1).max(200),
  appellation: z.string().min(1).max(200),
  style: z.string().refine(isValidLabelStyle, {
    message: 'Style must be one of: classic, modern, elegant, funky',
  }),
});

/**
 * Wine labels handler with rate limiting - supports GET and POST
 * @param req - Vercel request object
 * @param res - Vercel response object
 */
export async function handleWineLabels(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCorsPreflight(req, res)) return;
  // Apply rate limiting
  const isAllowed = await applyRateLimit(req, res);
  if (!isAllowed) {
    return;
  }

  try {
    if (req.method === 'GET') {
      const result = await getWineLabelsData(req.query);
      res.json(result);
    } else if (req.method === 'POST') {
      const result = await handleSubmitWineLabel(req);
      res.status(201).json({
        success: true,
        data: result,
      });
    } else {
      res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET and POST requests are allowed for this endpoint',
      });
    }
  } catch (error) {
    handleWineLabelsError(error, res);
  }
}

// Keep the old function name for backward compatibility
export const handleGetWineLabels = handleWineLabels;

/**
 * Core wine labels data fetching logic
 * @param query - Query parameters for filtering and pagination
 * @returns Promise with wine labels data and metadata
 */
async function getWineLabelsData(query: { style?: string; region?: string; limit?: number; offset?: number }): Promise<{
  success: boolean;
  data: WineLabel[];
  total: number;
  hasMore: boolean;
  cached: boolean;
}> {
  // Check if dependencies loaded properly
  if (!supabase) {
    logger.error('Supabase client not available for wine labels request', undefined, {
      operation: 'handleGetWineLabels',
      queryString: JSON.stringify(query),
    });
    throw createApiError(
      'Backend configuration is invalid. Please check environment variables.',
      500,
      'CONFIGURATION_ERROR',
    );
  }

  // Validate query parameters
  const validatedQuery = GetWineLabelsQuerySchema.parse(query);

  // Set transaction name for NewRelic tracking
  logger.setTransactionName('Wine Labels API');
  logger.addCustomAttribute('query.style', validatedQuery.style || 'all');
  logger.addCustomAttribute('query.limit', validatedQuery.limit);
  logger.addCustomAttribute('query.offset', validatedQuery.offset);

  // Create cache key based on query parameters
  const cacheKey = `wine_labels:${JSON.stringify(validatedQuery)}`;

  // Try to get from cache first
  const cachedResult = await logger.createSegment('cache_lookup', async () => {
    return cacheGet<{
      data: WineLabel[];
      total: number;
      hasMore: boolean;
    }>(cacheKey);
  });

  if (cachedResult) {
    logger.recordMetric('wine_labels/cache_hit', 1);
    logger.info('Wine labels served from cache', {
      operation: 'handleGetWineLabels',
      cacheKey,
      resultCount: cachedResult.data.length,
    });
    return {
      success: true,
      data: cachedResult.data,
      total: cachedResult.total,
      hasMore: cachedResult.hasMore,
      cached: true,
    };
  }

  // Build query
  let dbQuery = supabase
    .from('wine_labels')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(validatedQuery.offset, validatedQuery.offset + validatedQuery.limit - 1);

  // Apply filters
  if (validatedQuery.style) {
    dbQuery = dbQuery.eq('style', validatedQuery.style);
  }

  if (validatedQuery.region) {
    dbQuery = dbQuery.ilike('region', `%${validatedQuery.region}%`);
  }

  // Execute database query with NewRelic tracking
  const { data, error, count } = await logger.createSegment('database_query', async () => {
    return dbQuery;
  });

  logger.recordMetric('wine_labels/cache_miss', 1);

  if (error) {
    const errorContext = {
      message: error.message,
      details: error.details || '',
      hint: error.hint || '',
      code: error.code || '',
      operation: 'handleGetWineLabels',
      queryString: JSON.stringify(validatedQuery),
    };

    logger.error('Supabase error', error, errorContext);
    throw createApiError(`Failed to fetch wine labels: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  const total = count || 0;
  const hasMore = validatedQuery.offset + validatedQuery.limit < total;

  const result = {
    data: data || [],
    total,
    hasMore,
  };

  // Cache the result for 5 minutes
  await logger.createSegment('cache_set', async () => {
    return cacheSet(cacheKey, result, 300);
  });

  logger.info('Wine labels fetched from database', {
    operation: 'handleGetWineLabels',
    resultCount: result.data.length,
    total: result.total,
    hasMore: result.hasMore,
  });

  logger.recordMetric('wine_labels/request_success', 1);

  return {
    success: true,
    ...result,
    cached: false,
  };
}

/**
 * Handle wine label submission and queue processing
 * @param req - Vercel request object
 * @returns Promise with submission response
 */
async function handleSubmitWineLabel(req: VercelRequest): Promise<SubmitWineLabelResponse> {
  // Check if dependencies are available
  if (!supabase) {
    throw createApiError(
      'Backend configuration is invalid. Please check environment variables.',
      500,
      'CONFIGURATION_ERROR',
    );
  }

  // Validate request body
  logger.info('Raw request body received', {
    operation: 'handleSubmitWineLabel',
    rawBody: JSON.stringify(req.body),
  });

  const submissionData = SubmitWineLabelSchema.parse(req.body);

  logger.info('Processing wine label submission', {
    producerName: submissionData.producerName,
    wineName: submissionData.wineName,
    vintage: submissionData.vintage,
    variety: submissionData.variety,
    region: submissionData.region,
    appellation: submissionData.appellation,
    style: submissionData.style,
  });

  // Store submission in database (immutable record)
  const { data: submission, error: submissionError } = await supabase
    .from('wine_label_submissions')
    .insert({
      producer_name: submissionData.producerName,
      wine_name: submissionData.wineName,
      vintage: submissionData.vintage,
      variety: submissionData.variety,
      region: submissionData.region,
      appellation: submissionData.appellation,
      style: submissionData.style as LabelStyleId,
    })
    .select()
    .single();

  if (submissionError) {
    logger.error('Failed to create submission', submissionError, {
      operation: 'handleSubmitWineLabel',
      producerName: submissionData.producerName,
      wineName: submissionData.wineName,
      style: submissionData.style,
      errorDetails: JSON.stringify(submissionError),
    });

    // Handle different error formats
    const errorMessage =
      submissionError.message || submissionError.details || submissionError.hint || 'Unknown database error';
    throw createApiError(`Failed to create submission: ${errorMessage}`, 500, 'DATABASE_ERROR');
  }

  // Create new generation entity with "pending" status
  const { data: generation, error: generationError } = await supabase
    .from('label_generations')
    .insert({
      submission_id: submission.id,
      status: 'pending',
    })
    .select()
    .single();

  if (generationError) {
    logger.error('Failed to create generation', generationError, {
      operation: 'handleSubmitWineLabel',
      submissionId: submission.id,
    });
    throw createApiError(`Failed to create generation: ${generationError.message}`, 500, 'DATABASE_ERROR');
  }

  logger.info('Created submission and generation records', {
    submissionId: submission.id,
    generationId: generation.id,
  });

  // Queue generation for async processing via QStash
  let messageId: string | undefined;
  try {
    messageId = await queueLabelGeneration({
      submissionId: submission.id,
      style: submissionData.style as LabelStyleId,
      wineData: {
        producerName: submissionData.producerName,
        wineName: submissionData.wineName,
        vintage: submissionData.vintage,
        variety: submissionData.variety,
        region: submissionData.region,
        appellation: submissionData.appellation,
      },
    });

    logger.info('Queued generation job', {
      submissionId: submission.id,
      generationId: generation.id,
      messageId,
    });
  } catch (queueError) {
    const queueErrorMessage = queueError instanceof Error ? queueError.message : String(queueError);
    logger.error('Failed to queue generation job', queueError, {
      operation: 'handleSubmitWineLabel',
      submissionId: submission.id,
      generationId: generation.id,
      queueError: queueErrorMessage,
    });

    // Update generation status to failed
    await supabase
      .from('label_generations')
      .update({
        status: 'failed',
        error: `Failed to queue processing job: ${queueErrorMessage}`,
      })
      .eq('id', generation.id);

    throw createApiError('Failed to queue processing job', 500, 'QUEUE_ERROR');
  }

  return {
    submissionId: submission.id,
    generationId: generation.id,
    statusUrl: `/api/wine-labels/generations/${generation.id}`,
    queueMessageId: messageId,
  };
}

/**
 * Handle errors for wine labels API
 */
function handleWineLabelsError(error: unknown, res: VercelResponse): void {
  console.error('❌ Wine labels API error:', error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Handle backend route errors
  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as Error & { statusCode: number; code?: string };
    res.status(apiError.statusCode).json({
      success: false,
      error: apiError.code || 'UNKNOWN_ERROR',
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
