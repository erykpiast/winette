import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { supabase, type WineLabel } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { applyRateLimit } from '../lib/rate-limiter.js';

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

/**
 * Wine labels handler with rate limiting
 * @param req - Vercel request object
 * @param res - Vercel response object
 */
export async function handleGetWineLabels(req: VercelRequest, res: VercelResponse): Promise<void> {
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

  try {
    const result = await getWineLabelsData(req.query);
    res.json(result);
  } catch (error) {
    handleWineLabelsError(error, res);
  }
}

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
