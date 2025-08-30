/**
 * Label Storage Service - Handles storage of rendered label previews
 * Provides clean abstraction for storage operations with proper separation of concerns
 */

import { uploadRenderedLabel } from '#backend/lib/image-storage.js';
import { logger } from '#backend/lib/logger.js';

export interface LabelStorageService {
  storeRenderedLabel(buffer: Buffer, generationId: string): Promise<string>;
}

/**
 * Production storage implementation using Supabase
 * Leverages content-addressable storage for deduplication
 */
export class SupabaseLabelStorage implements LabelStorageService {
  async storeRenderedLabel(buffer: Buffer, generationId: string): Promise<string> {
    logger.debug('Storing rendered label to Supabase', {
      generationId,
      size: buffer.length,
    });

    const { publicUrl } = await uploadRenderedLabel(buffer, generationId);
    return publicUrl;
  }
}

/**
 * Mock storage implementation for testing
 * Returns predictable mock URLs without external dependencies
 */
export class MockLabelStorage implements LabelStorageService {
  async storeRenderedLabel(_buffer: Buffer, generationId: string): Promise<string> {
    // Simulate storage delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mockUrl = `https://winette.vercel.app/mock-images/mock-label-${generationId}.png`;

    logger.debug('Mock label storage', {
      generationId,
      mockUrl,
    });

    return mockUrl;
  }
}
