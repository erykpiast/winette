// Phase 1.3.4.3: Image Generation Service
// Main service that coordinates image generation, storage, and DSL updates

import { createHash } from 'node:crypto';
import { supabase } from '#backend/lib/database.js';
import {
  type ImageModelAdapter,
  type ImagePromptSpec,
  MockImageModelAdapter,
  ProductionImageModelAdapter,
  uploadImage,
} from '#backend/lib/image-generation.js';

// Re-export ImagePromptSpec for use by other modules
export type { ImagePromptSpec } from '#backend/lib/image-generation.js';

import { initializeImageStorage } from '#backend/lib/image-storage.js';
import { logger } from '#backend/lib/logger.js';
import type { LabelDSL } from '#backend/types/label-generation.js';

// ============================================================================
// Service Configuration
// ============================================================================

export interface ImageGenerationConfig {
  adapter: ImageModelAdapter;
  maxConcurrentGenerations?: number;
}

// ============================================================================
// Image Generation Service
// ============================================================================

export class ImageGenerationService {
  private adapter: ImageModelAdapter;
  private maxConcurrentGenerations: number;

  constructor(config: ImageGenerationConfig) {
    this.adapter = config.adapter;
    this.maxConcurrentGenerations = config.maxConcurrentGenerations || 3;
  }

  /**
   * Get the current adapter (primarily for testing)
   */
  get currentAdapter(): ImageModelAdapter {
    return this.adapter;
  }

  /**
   * Initialize storage and verify configuration
   */
  async initialize(): Promise<void> {
    try {
      await initializeImageStorage();
      logger.info('Image generation service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize image generation service:', error);
      throw error;
    }
  }

  /**
   * Generate images from specs and update DSL with asset information
   */
  async generateAndStoreImages(
    generationId: string,
    specs: ImagePromptSpec[],
  ): Promise<{ updatedAssets: LabelDSL['assets']; errors: string[] }> {
    if (specs.length === 0) {
      return { updatedAssets: [], errors: [] };
    }

    logger.info('Starting image generation batch', {
      generationId,
      specCount: specs.length,
    });

    const results: LabelDSL['assets'] = [];
    const errors: string[] = [];

    // Process in batches to respect concurrency limits
    const batches = this.chunkArray(specs, this.maxConcurrentGenerations);

    for (const batch of batches) {
      const batchPromises = batch.map((spec) => this.processImageSpec(generationId, spec));

      const batchResults = await Promise.allSettled(batchPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const spec = batch[i];

        if (!result || !spec) continue;

        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          const errorMessage =
            result.status === 'rejected' ? result.reason?.message || 'Unknown error' : 'Unknown error';

          errors.push(`Failed to generate image for ${spec.id}: ${errorMessage}`);
          logger.error('Image generation failed', {
            specId: spec.id,
            error: errorMessage,
          });
        }
      }
    }

    logger.info('Image generation batch completed', {
      generationId,
      successful: results.length,
      failed: errors.length,
    });

    return { updatedAssets: results, errors };
  }

  /**
   * Process a single image specification
   */
  private async processImageSpec(generationId: string, spec: ImagePromptSpec): Promise<LabelDSL['assets'][0] | null> {
    try {
      logger.info('Processing image spec', {
        generationId,
        specId: spec.id,
        purpose: spec.purpose,
      });

      // Step 1: Generate image using adapter
      const { data, meta } = await this.adapter.generate(spec);

      // Step 2: Calculate checksum once (avoids double hashing in uploadImage)
      const checksum = createHash('sha256').update(data).digest('hex');

      // Step 3: Upload image with pre-computed checksum and all metadata
      const uploadResult = await uploadImage({
        generationId,
        assetId: spec.id,
        data,
        checksum, // Pass pre-computed checksum to avoid re-hashing
        prompt: spec.prompt,
        model: meta.model,
        seed: meta.seed,
      });

      // Step 4: Return asset for DSL
      return {
        id: spec.id,
        type: 'image' as const,
        url: uploadResult.url,
        width: uploadResult.width,
        height: uploadResult.height,
      };
    } catch (error) {
      logger.error('Failed to process image spec', {
        generationId,
        specId: spec.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get existing assets for a generation
   */
  async getExistingAssets(generationId: string): Promise<LabelDSL['assets']> {
    if (!supabase) {
      return [];
    }

    try {
      const { data: assets, error } = await supabase
        .from('label_assets')
        .select('asset_id, url, width, height, format')
        .eq('generation_id', generationId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch existing assets', {
          generationId,
          error: error.message,
        });
        return [];
      }

      return assets.map((asset) => ({
        id: asset.asset_id,
        type: 'image' as const,
        url: asset.url,
        width: asset.width,
        height: asset.height,
      }));
    } catch (error) {
      logger.error('Error fetching existing assets:', error);
      return [];
    }
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// ============================================================================
// Default Service Instance
// ============================================================================

// Create a default service instance with environment-appropriate adapter
function createDefaultAdapter(): ImageModelAdapter {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  const hasApiKeys = process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY;

  if (isProduction && hasApiKeys) {
    return new ProductionImageModelAdapter();
  } else {
    return new MockImageModelAdapter();
  }
}

export const defaultImageGenerationService = new ImageGenerationService({
  adapter: createDefaultAdapter(),
  maxConcurrentGenerations: 3,
});

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate images and update DSL assets array
 */
export async function generateImagesForDSL(
  generationId: string,
  specs: ImagePromptSpec[],
  currentDSL: LabelDSL,
): Promise<{ updatedDSL: LabelDSL; errors: string[] }> {
  const service = defaultImageGenerationService;

  try {
    await service.initialize();

    const { updatedAssets, errors } = await service.generateAndStoreImages(generationId, specs);

    // Merge with existing assets, removing duplicates by id
    const existingAssets = currentDSL.assets || [];
    const assetMap = new Map(existingAssets.map((asset) => [asset.id, asset]));

    // Add/update with new assets
    updatedAssets.forEach((asset) => {
      assetMap.set(asset.id, asset);
    });

    const updatedDSL: LabelDSL = {
      ...currentDSL,
      assets: Array.from(assetMap.values()),
    };

    return { updatedDSL, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Image generation for DSL failed:', error);

    return {
      updatedDSL: currentDSL,
      errors: [`Image generation failed: ${errorMessage}`],
    };
  }
}
