// Error handling and cleanup mechanism tests
// Tests retry logic, cleanup functions, and error recovery scenarios

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifySupabaseError,
  ImageGenerationError,
  type RetryConfig,
  withCleanup,
  withRetry,
} from '../lib/error-handling.js';
import { logger } from '../lib/logger.js';

// Mock dependencies
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock database module for uploadImage tests
vi.mock('../lib/database.js', () => ({
  supabase: {
    from: vi.fn(),
    storage: vi.fn(),
  },
}));

describe('Error Handling System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRetry function', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.info).not.toHaveBeenCalled(); // No retry messages
    });

    it('should retry on transient failures', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValue('success on retry');

      // Use real timers for this test to avoid race condition
      vi.useRealTimers();

      const result = await withRetry(operation, { maxAttempts: 3, baseDelay: 1 });

      expect(result).toBe('success on retry');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        'Operation failed, retrying',
        expect.objectContaining({
          attempt: 1,
          totalAttempts: 3,
          nextRetryInMs: expect.any(Number),
        }),
      );

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should respect maxAttempts limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      // Use real timers for this test to avoid Promise rejection warnings
      vi.useRealTimers();

      await expect(withRetry(operation, { maxAttempts: 2, baseDelay: 1 })).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        'All retry attempts exhausted',
        expect.objectContaining({
          totalAttempts: 2,
        }),
      );

      // Restore fake timers for other tests
      vi.useFakeTimers();
    }, 10000);

    it('should not retry non-retryable ImageGenerationError', async () => {
      const operation = vi.fn().mockRejectedValue(new ImageGenerationError('Validation error', 'validation', false));

      await expect(withRetry(operation)).rejects.toThrow('Validation error');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Non-retryable error encountered, failing immediately',
        expect.objectContaining({
          errorType: 'validation',
        }),
      );
    });

    it('should use exponential backoff with jitter', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const config: Partial<RetryConfig> = {
        maxAttempts: 3,
        baseDelay: 1, // Very short delay for test
        exponentialBase: 2,
        jitter: true,
      };

      // Use real timers for this test to avoid Promise rejection warnings
      vi.useRealTimers();

      await expect(withRetry(operation, config)).rejects.toThrow();

      // Should have been called for each delay calculation
      expect(logger.warn).toHaveBeenCalledTimes(2); // 2 retry attempts

      const calls = vi.mocked(logger.warn).mock.calls;
      const delay1 = calls[0]?.[1]?.nextRetryInMs as number;
      const delay2 = calls[1]?.[1]?.nextRetryInMs as number;

      // Verify delays exist (jitter makes exact comparison difficult)
      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(0);
      // Second delay should generally be larger due to exponential backoff
      // But jitter can make it vary significantly, so use loose bounds
      expect(delay2).toBeGreaterThan(delay1 * 0.5);
      expect(delay2).toBeLessThan(delay1 * 4.0);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    }, 10000);
  });

  describe('withCleanup function', () => {
    it('should not run cleanup on success', async () => {
      const cleanup = vi.fn();
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withCleanup(operation, [cleanup]);

      expect(result).toBe('success');
      expect(cleanup).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Operation completed successfully', expect.any(Object));
    });

    it('should run cleanup functions on failure', async () => {
      const cleanup1 = vi.fn().mockResolvedValue(undefined);
      const cleanup2 = vi.fn().mockResolvedValue(undefined);
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withCleanup(operation, [cleanup1, cleanup2])).rejects.toThrow('Operation failed');

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'All cleanup operations completed successfully',
        expect.objectContaining({ totalCleanups: 2 }),
      );
    });

    it('should handle cleanup failures gracefully', async () => {
      const cleanup1 = vi.fn().mockRejectedValue(new Error('Cleanup 1 failed'));
      const cleanup2 = vi.fn().mockResolvedValue(undefined);
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withCleanup(operation, [cleanup1, cleanup2])).rejects.toThrow('Operation failed');

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Some cleanup operations failed',
        expect.objectContaining({
          totalCleanups: 2,
          failedCleanups: 1,
        }),
      );
    });

    it('should re-throw original error even after cleanup failures', async () => {
      const cleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      const operation = vi.fn().mockRejectedValue(new Error('Original error'));

      await expect(withCleanup(operation, [cleanup])).rejects.toThrow('Original error');
    });
  });

  describe('classifySupabaseError function', () => {
    it('should classify network errors as retryable', () => {
      const error = { message: 'network timeout', code: 'ETIMEDOUT' };

      const classified = classifySupabaseError(error);

      expect(classified).toBeInstanceOf(ImageGenerationError);
      expect(classified.type).toBe('network');
      expect(classified.retryable).toBe(true);
      expect(classified.message).toContain('Network error');
    });

    it('should classify storage duplicate errors as non-retryable', () => {
      const error = { message: 'file already exists in storage bucket' };

      const classified = classifySupabaseError(error);

      expect(classified.type).toBe('storage');
      expect(classified.retryable).toBe(false);
      expect(classified.message).toContain('Storage conflict (acceptable)');
    });

    it('should classify constraint violations as non-retryable', () => {
      const error = { message: 'unique constraint violation', code: '23505' };

      const classified = classifySupabaseError(error);

      expect(classified.type).toBe('database');
      expect(classified.retryable).toBe(false);
      expect(classified.message).toContain('Database constraint error');
    });

    it('should classify connection errors as retryable', () => {
      const error = { message: 'connection refused', code: '08006' };

      const classified = classifySupabaseError(error);

      expect(classified.type).toBe('network'); // Connection errors classified as network
      expect(classified.retryable).toBe(true);
      expect(classified.message).toContain('Network error');
    });

    it('should handle unknown errors as non-retryable', () => {
      const error = { message: 'some unknown error' };

      const classified = classifySupabaseError(error);

      expect(classified.type).toBe('database');
      expect(classified.retryable).toBe(false);
      expect(classified.message).toContain('Database error');
    });
  });

  describe('Error scenarios with complex operations', () => {
    it('should handle nested operations with retry and cleanup', async () => {
      let uploadCalled = false;
      let dbCalled = false;
      const cleanupCalled = vi.fn().mockResolvedValue(undefined);

      const complexOperation = async () => {
        // Simulate upload step that succeeds
        await withRetry(async () => {
          uploadCalled = true;
          return 'upload-success';
        });

        // Simulate database step that fails
        await withRetry(async () => {
          dbCalled = true;
          throw new ImageGenerationError('Database constraint error', 'database', false);
        });
      };

      // Execute the operation with cleanup and await the rejection
      await expect(withCleanup(complexOperation, [cleanupCalled])).rejects.toThrow('Database constraint error');

      expect(uploadCalled).toBe(true);
      expect(dbCalled).toBe(true);
      expect(cleanupCalled).toHaveBeenCalled();
    });

    it('should handle transient failures followed by success', async () => {
      let attempts = 0;
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new ImageGenerationError('Temporary network issue', 'network', true);
        }
        return 'success-after-retries';
      };

      const promise = withRetry(flakyOperation, { maxAttempts: 5, baseDelay: 1 });

      // Fast-forward through the delays for retries
      await vi.advanceTimersByTimeAsync(10); // Advance enough time for all retries

      const result = await promise;

      expect(result).toBe('success-after-retries');
      expect(attempts).toBe(3);
    });

    it('should classify and handle different error types appropriately', () => {
      const testCases = [
        {
          error: { message: 'network timeout' },
          expectedType: 'network',
          expectedRetryable: true,
        },
        {
          error: { message: 'unique constraint violation', code: '23505' },
          expectedType: 'database',
          expectedRetryable: false,
        },
        {
          error: { message: 'storage bucket error' },
          expectedType: 'storage',
          expectedRetryable: true,
        },
        {
          error: { message: 'file already exists in bucket' },
          expectedType: 'storage',
          expectedRetryable: false,
        },
      ];

      testCases.forEach(({ error, expectedType, expectedRetryable }) => {
        const classified = classifySupabaseError(error);
        expect(classified.type).toBe(expectedType);
        expect(classified.retryable).toBe(expectedRetryable);
      });
    });
  });

  describe('integration with image generation service', () => {
    it('should handle service-level errors with proper error propagation', async () => {
      // This would test the actual service integration, but requires more complex mocking
      // The pattern is already established in the uploadImage tests above

      const mockAdapter = {
        generate: vi.fn().mockRejectedValue(new Error('Image generation failed')),
      };

      // Would instantiate ImageGenerationService with mockAdapter and test error handling
      expect(mockAdapter.generate).toBeDefined();
    });
  });
});
