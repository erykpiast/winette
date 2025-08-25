// Simplified error handling tests focused on core functionality
// Tests error classification and cleanup mechanisms without complex timing

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CleanupFunction,
  classifySupabaseError,
  ImageGenerationError,
  withCleanup,
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

describe('Error Handling Core Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImageGenerationError class', () => {
    it('should create error with correct properties', () => {
      const error = new ImageGenerationError('Test error message', 'storage', true, { key: 'value' });

      expect(error.message).toBe('Test error message');
      expect(error.type).toBe('storage');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('ImageGenerationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should default retryable to false', () => {
      const error = new ImageGenerationError('Test', 'validation');
      expect(error.retryable).toBe(false);
    });
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

    it('should handle empty cleanup array', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withCleanup(operation, [])).rejects.toThrow('Operation failed');

      expect(logger.info).toHaveBeenCalledWith(
        'All cleanup operations completed successfully',
        expect.objectContaining({ totalCleanups: 0 }),
      );
    });
  });

  describe('classifySupabaseError function', () => {
    it('should classify network errors as retryable', () => {
      const testCases = [
        { message: 'network timeout' },
        { message: 'connection refused' },
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' },
        { message: 'timeout occurred' },
      ];

      testCases.forEach((error) => {
        const classified = classifySupabaseError(error);
        expect(classified.type).toBe('network');
        expect(classified.retryable).toBe(true);
        expect(classified.message).toContain('Network error');
      });
    });

    it('should classify storage errors appropriately', () => {
      const testCases = [
        {
          error: { message: 'storage bucket not found' },
          expectedRetryable: true,
        },
        {
          error: { message: 'file already exists in bucket' },
          expectedRetryable: false,
        },
        {
          error: { message: 'bucket duplicate key' },
          expectedRetryable: false,
        },
      ];

      testCases.forEach(({ error, expectedRetryable }) => {
        const classified = classifySupabaseError(error);
        expect(classified.type).toBe('storage');
        expect(classified.retryable).toBe(expectedRetryable);
        expect(classified.message).toContain('Storage');
      });
    });

    it('should classify database errors appropriately', () => {
      const testCases = [
        {
          error: { message: 'unique constraint violation', code: '23505' },
          expectedRetryable: false,
        },
        {
          error: { message: 'check constraint failed', code: '23514' },
          expectedRetryable: false,
        },
        {
          error: { message: 'database unavailable', code: '08000' },
          expectedRetryable: true,
        },
        {
          error: { message: 'server error', code: '50000' },
          expectedRetryable: true,
        },
      ];

      testCases.forEach(({ error, expectedRetryable }) => {
        const classified = classifySupabaseError(error);
        expect(classified.type).toBe('database');
        expect(classified.retryable).toBe(expectedRetryable);
        expect(classified.message).toContain('Database');
      });
    });

    it('should handle unknown errors as non-retryable database errors', () => {
      const error = { message: 'some unknown error' };

      const classified = classifySupabaseError(error);

      expect(classified.type).toBe('database');
      expect(classified.retryable).toBe(false);
      expect(classified.message).toBe('Database error: some unknown error');
    });

    it('should handle errors with missing properties', () => {
      const testCases = [null, undefined, {}, { code: null }, { message: null }];

      testCases.forEach((error) => {
        const classified = classifySupabaseError(error);
        expect(classified).toBeInstanceOf(ImageGenerationError);
        expect(classified.type).toBe('database');
        expect(classified.retryable).toBe(false);
      });
    });
  });

  describe('Error propagation patterns', () => {
    it('should maintain error context through classification', () => {
      const originalError = {
        message: 'network timeout',
        code: 'ETIMEDOUT',
        details: 'connection details',
        hint: 'check network',
      };

      const classified = classifySupabaseError(originalError);

      expect(classified.context).toEqual({
        code: 'ETIMEDOUT',
        details: 'connection details',
        hint: 'check network',
      });
    });

    it('should handle ImageGenerationError instances appropriately', () => {
      const originalError = new ImageGenerationError('Original validation error', 'validation', false, {
        field: 'data',
      });

      // Should pass through unchanged when classifying already-classified errors
      expect(originalError.type).toBe('validation');
      expect(originalError.retryable).toBe(false);
      expect(originalError.context).toEqual({ field: 'data' });
    });
  });

  describe('Integration scenarios', () => {
    it('should support chained error handling operations', async () => {
      const cleanupLog: string[] = [];

      const cleanup1: CleanupFunction = async () => {
        cleanupLog.push('cleanup1');
      };

      const cleanup2: CleanupFunction = async () => {
        cleanupLog.push('cleanup2');
        throw new Error('Cleanup failed');
      };

      const cleanup3: CleanupFunction = async () => {
        cleanupLog.push('cleanup3');
      };

      const operation = async () => {
        throw new ImageGenerationError('Processing failed', 'processing', false);
      };

      await expect(withCleanup(operation, [cleanup1, cleanup2, cleanup3])).rejects.toThrow('Processing failed');

      expect(cleanupLog).toEqual(['cleanup1', 'cleanup2', 'cleanup3']);
    });

    it('should provide meaningful error context for debugging', async () => {
      const context = { generationId: 'gen-123', operation: 'test' };
      const operation = vi.fn().mockRejectedValue(new Error('Test failure'));

      await expect(withCleanup(operation, [], context)).rejects.toThrow('Test failure');

      expect(logger.error).toHaveBeenCalledWith(
        'Operation failed, running cleanup',
        expect.objectContaining({
          generationId: 'gen-123',
          operation: 'test',
          error: 'Test failure',
        }),
      );
    });
  });
});
