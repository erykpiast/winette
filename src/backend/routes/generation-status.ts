import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { handleCorsPreflight } from '../lib/cors.js';
import { supabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { applyRateLimit } from '../lib/rate-limiter.js';
import type { GenerationStatusResponse } from '../types/label-generation.js';
import { ApiError, createApiError } from './wine-labels.js';

// Validation schema for generation ID parameter
const GenerationIdSchema = z.object({
  id: z.string().uuid('Invalid generation ID format'),
});

/**
 * Generation status handler with rate limiting
 * @param req - Vercel request object
 * @param res - Vercel response object
 */
export async function handleGenerationStatus(req: VercelRequest, res: VercelResponse): Promise<void> {
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

  try {
    const result = await getGenerationStatus(req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleGenerationStatusError(error, res);
  }
}

/**
 * Get generation status data
 * @param query - Query parameters containing generation ID
 * @returns Promise with generation status data
 */
async function getGenerationStatus(query: Record<string, unknown>): Promise<GenerationStatusResponse> {
  // Check if dependencies are available
  if (!supabase) {
    throw createApiError(
      'Backend configuration is invalid. Please check environment variables.',
      500,
      'CONFIGURATION_ERROR',
    );
  }

  // Validate generation ID
  const { id } = GenerationIdSchema.parse(query);

  logger.info('Fetching generation status', {
    generationId: id,
    operation: 'handleGenerationStatus',
  });

  // Query generation data
  const { data: generation, error } = await supabase.from('label_generations').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - generation not found
      throw createApiError('Generation not found', 404, 'GENERATION_NOT_FOUND');
    }

    logger.error('Database error fetching generation', error, {
      operation: 'handleGenerationStatus',
      generationId: id,
    });

    throw createApiError(`Failed to fetch generation: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  logger.info('Generation status retrieved', {
    generationId: id,
    status: generation.status,
    submissionId: generation.submission_id,
  });

  // Convert database row to API response
  const response: GenerationStatusResponse = {
    id: generation.id,
    submissionId: generation.submission_id,
    status: generation.status,
    createdAt: new Date(generation.created_at),
    updatedAt: new Date(generation.updated_at),
  };

  // Only add optional properties if they exist
  if (generation.phase) {
    response.phase = generation.phase;
  }
  if (generation.design_scheme) {
    response.designScheme = generation.design_scheme;
  }
  if (generation.description) {
    response.description = generation.description;
  }
  if (generation.error) {
    response.error = generation.error;
  }
  if (generation.completed_at) {
    response.completedAt = new Date(generation.completed_at);
  }

  return response;
}

/**
 * Handle errors for generation status API
 */
function handleGenerationStatusError(error: unknown, res: VercelResponse): void {
  console.error('❌ Generation status API error:', error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid generation ID',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Handle API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
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
