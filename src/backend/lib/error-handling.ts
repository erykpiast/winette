// Enhanced error handling utilities for image generation

import { logger } from './logger.js';

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly type: 'validation' | 'storage' | 'database' | 'network' | 'processing',
    public readonly retryable: boolean = false,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBase: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBase: 2,
  jitter: true,
};

/**
 * Exponential backoff with optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * config.exponentialBase ** (attempt - 1);
  const delayWithMax = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add ±25% jitter
    const jitterFactor = 0.25;
    const jitter = delayWithMax * jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, delayWithMax + jitter);
  }

  return delayWithMax;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: Record<string, unknown> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation();

      if (attempt > 1) {
        logger.info('Retry operation succeeded', {
          ...context,
          attempt,
          totalAttempts: finalConfig.maxAttempts,
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (error instanceof ImageGenerationError && !error.retryable) {
        logger.error('Non-retryable error encountered, failing immediately', {
          ...context,
          error: error.message,
          errorType: error.type,
          attempt,
        });
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === finalConfig.maxAttempts) {
        logger.error('All retry attempts exhausted', {
          ...context,
          error: lastError.message,
          totalAttempts: finalConfig.maxAttempts,
        });
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, finalConfig);

      logger.warn('Operation failed, retrying', {
        ...context,
        error: lastError.message,
        attempt,
        totalAttempts: finalConfig.maxAttempts,
        nextRetryInMs: delay,
      });

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError ?? new Error('All retry attempts failed');
}

/**
 * Classify Supabase errors by type and retryability
 */
export function classifySupabaseError(error: unknown): ImageGenerationError {
  const errorObj = error as { message: string; code: string; details: string; hint: string } | undefined;
  const message = errorObj?.message || 'Unknown Supabase error';
  const code = errorObj?.code;
  const details = errorObj?.details;
  const hint = errorObj?.hint;

  const context = { code, details, hint };

  // Network/connection errors - retryable
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'
  ) {
    return new ImageGenerationError(`Network error: ${message}`, 'network', true, context);
  }

  // Storage errors
  if (message.includes('storage') || message.includes('bucket')) {
    // File already exists is not an error in our case
    if (message.includes('already exists') || message.includes('duplicate')) {
      return new ImageGenerationError(`Storage conflict (acceptable): ${message}`, 'storage', false, context);
    }

    // Other storage errors might be retryable
    return new ImageGenerationError(`Storage error: ${message}`, 'storage', true, context);
  }

  // Database errors
  if (code?.startsWith('23')) {
    // Integrity constraint violations
    return new ImageGenerationError(
      `Database constraint error: ${message}`,
      'database',
      false, // Don't retry constraint violations
      context,
    );
  }

  if (code === '08000' || code === '08006') {
    // Connection errors
    return new ImageGenerationError(`Database connection error: ${message}`, 'database', true, context);
  }

  // Server errors (5xx equivalent) - potentially retryable
  if (code === '50000' || message.includes('server error')) {
    return new ImageGenerationError(`Database server error: ${message}`, 'database', true, context);
  }

  // Default to non-retryable database error
  return new ImageGenerationError(`Database error: ${message}`, 'database', false, context);
}

/**
 * Cleanup function type for resource management
 */
export type CleanupFunction = () => Promise<void>;

/**
 * Transaction-like wrapper that manages cleanup on failure
 */
export async function withCleanup<T>(
  operation: () => Promise<T>,
  cleanupFunctions: CleanupFunction[] = [],
  context: Record<string, unknown> = {},
): Promise<T> {
  try {
    const result = await operation();

    // Success - no cleanup needed
    logger.info(
      'Operation completed successfully',
      context as Record<string, string | number | boolean | null | undefined>,
    );
    return result;
  } catch (error) {
    logger.error('Operation failed, running cleanup', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      cleanupCount: cleanupFunctions.length,
    });

    // Run all cleanup functions
    const cleanupResults = await Promise.allSettled(
      cleanupFunctions.map((cleanup, index) =>
        cleanup().catch((cleanupError) => {
          logger.error('Cleanup function failed', {
            ...context,
            cleanupIndex: index,
            cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
          throw cleanupError;
        }),
      ),
    );

    // Log cleanup results
    const failedCleanups = cleanupResults.filter((result) => result.status === 'rejected');
    if (failedCleanups.length > 0) {
      logger.error('Some cleanup operations failed', {
        ...context,
        totalCleanups: cleanupFunctions.length,
        failedCleanups: failedCleanups.length,
      });
    } else {
      logger.info('All cleanup operations completed successfully', {
        ...context,
        totalCleanups: cleanupFunctions.length,
      });
    }

    // Re-throw the original error
    throw error;
  }
}
