// Phase 1.3.4.3: Image Generation and Storage Implementation

import crypto from 'node:crypto';
import sharp from 'sharp';
import { supabase } from './database.js';
import { classifySupabaseError, ImageGenerationError, withCleanup, withRetry } from './error-handling.js';
import { logger } from './logger.js';

// ============================================================================
// Image Generation Adapter Interface
// ============================================================================

export interface ImagePromptSpec {
  id: string;
  purpose: 'background' | 'foreground' | 'decoration';
  prompt: string;
  negativePrompt?: string;
  guidance?: number;
  aspect: '1:1' | '4:3' | '3:2' | '2:3' | '9:16';
}

export interface GeneratedImageMeta {
  model: string;
  seed: string;
  width: number;
  height: number;
}

export interface ImageModelAdapter {
  generate(spec: ImagePromptSpec): Promise<{ data: Buffer; meta: GeneratedImageMeta }>;
}

// ============================================================================
// Upload Result Interface
// ============================================================================

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  format: string;
  checksum: string;
}

// ============================================================================
// Image Metadata Detection
// ============================================================================

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}

async function detectImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error('Unable to read image dimensions or format');
    }

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (error) {
    logger.error('Failed to detect image metadata:', error);
    throw new Error('Invalid image buffer or unsupported format');
  }
}

// ============================================================================
// Checksum Calculation
// ============================================================================

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ============================================================================
// Upload Image API
// ============================================================================

/**
 * Upload image to content-addressable storage with proper deduplication.
 *
 * Content-addressable approach:
 * - Path: content/{checksum}.{ext} (deterministic, collision-free)
 * - Same content always gets same URL globally
 * - Safe immutable caching (URL never changes content)
 * - Storage deduplication at file level (same content uploaded once)
 * - Database tracks metadata per (generation_id, asset_id) pair
 *
 * Deduplication logic:
 * - Check if (generation_id, asset_id) record exists with same checksum
 * - If yes: return existing URL without re-upload
 * - If no: upload to content/{checksum}.{ext} and create record
 *
 * @param checksum - Optional pre-computed SHA256 to avoid re-hashing
 * @returns Absolute public URL, dimensions, format, and checksum
 */
export async function uploadImage({
  generationId,
  assetId,
  data,
  checksum,
  prompt,
  model,
  seed,
}: {
  generationId: string;
  assetId: string;
  data: Buffer;
  checksum?: string; // Optional - avoids re-hashing if provided
  prompt?: string;
  model?: string;
  seed?: string;
}): Promise<UploadResult> {
  if (!supabase) {
    throw new ImageGenerationError('Supabase client not initialized', 'validation', false, { generationId, assetId });
  }

  const context = { generationId, assetId, dataSize: data.length };

  // Step 1: Detect format, read dimensions (with validation)
  const metadata = await withRetry(
    () => detectImageMetadata(data),
    { maxAttempts: 2 }, // Quick retry for image processing
    { ...context, operation: 'detect_metadata' },
  ).catch((error) => {
    throw new ImageGenerationError(`Image metadata detection failed: ${error.message}`, 'validation', false, context);
  });

  // Step 2: Use provided checksum or compute it once
  const imageChecksum = checksum || calculateChecksum(data);
  const filePath = `content/${imageChecksum}.${metadata.format}`;
  const fullContext = { ...context, checksum: imageChecksum.substring(0, 8), filePath };

  // Step 3: First check for existing content globally by checksum
  const globalRecord = await withRetry(
    async () => {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { data: record, error } = await supabase
        .from('label_assets')
        .select('url, width, height, format, checksum')
        .eq('checksum', imageChecksum)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw classifySupabaseError(error);
      }

      return record;
    },
    { maxAttempts: 3 },
    { ...fullContext, operation: 'check_global_checksum' },
  );

  // If content exists globally, reuse it for this (generation_id, asset_id)
  if (globalRecord) {
    logger.info('Content exists globally, reusing for new generation/asset', {
      ...fullContext,
      existingUrl: globalRecord.url,
    });

    // Create record for this (generation_id, asset_id) pointing to existing content
    await withRetry(
      async () => {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { error: upsertError } = await supabase.from('label_assets').upsert(
          {
            generation_id: generationId,
            asset_id: assetId,
            url: globalRecord.url,
            width: globalRecord.width,
            height: globalRecord.height,
            format: globalRecord.format,
            checksum: imageChecksum,
            prompt: prompt || null,
            model: model || null,
            seed: seed || null,
          },
          {
            onConflict: 'generation_id,asset_id',
            ignoreDuplicates: false,
          },
        );

        if (upsertError) {
          throw classifySupabaseError(upsertError);
        }
      },
      { maxAttempts: 3 },
      { ...fullContext, operation: 'create_alias_record' },
    );

    return {
      url: globalRecord.url,
      width: globalRecord.width,
      height: globalRecord.height,
      format: globalRecord.format,
      checksum: imageChecksum,
    };
  }

  // Step 4: Check for existing record for this specific (generation_id, asset_id)
  const existingRecord = await withRetry(
    async () => {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { data: record, error } = await supabase
        .from('label_assets')
        .select('url, width, height, format, checksum')
        .eq('generation_id', generationId)
        .eq('asset_id', assetId)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw classifySupabaseError(error);
      }

      return record;
    },
    { maxAttempts: 3 },
    { ...fullContext, operation: 'check_existing_record' },
  );

  // If record exists and content unchanged, return existing data
  if (existingRecord && existingRecord.checksum === imageChecksum) {
    logger.info('Record exists with same content, returning existing data', {
      ...fullContext,
      url: existingRecord.url,
    });

    return {
      url: existingRecord.url,
      width: existingRecord.width,
      height: existingRecord.height,
      format: existingRecord.format,
      checksum: imageChecksum,
    };
  }

  // Step 5: Upload to storage and handle database with cleanup on failure
  return withCleanup(
    async (): Promise<UploadResult> => {
      let publicUrl: string | null = null;

      // Step 5a: Upload to storage with retry
      await withRetry(
        async () => {
          if (!supabase) throw new Error('Supabase client not initialized');

          const { error: uploadError } = await supabase.storage.from('label-images').upload(filePath, data, {
            contentType: `image/${metadata.format}`,
            cacheControl: 'public, max-age=31536000, immutable',
            upsert: false, // Never overwrite - content-addressable paths are unique
          });

          if (uploadError) {
            // File already exists is acceptable for content-addressable storage
            if (uploadError.message?.includes('already exists') || uploadError.message?.includes('duplicate')) {
              logger.info('Content already exists in storage, reusing existing file', fullContext);
              return;
            }
            throw classifySupabaseError(uploadError);
          }

          logger.info('File uploaded to storage successfully', fullContext);
        },
        { maxAttempts: 3 },
        { ...fullContext, operation: 'storage_upload' },
      );

      // Step 5b: Get public URL
      if (!supabase) throw new Error('Supabase client not initialized');

      const { data: urlData } = supabase.storage.from('label-images').getPublicUrl(filePath);
      if (!urlData.publicUrl) {
        throw new ImageGenerationError('Failed to get public URL for uploaded image', 'storage', false, fullContext);
      }
      publicUrl = urlData.publicUrl;

      // Step 5c: Database upsert with retry
      await withRetry(
        async () => {
          if (!supabase) throw new Error('Supabase client not initialized');

          const { error: upsertError } = await supabase.from('label_assets').upsert(
            {
              generation_id: generationId,
              asset_id: assetId,
              url: publicUrl,
              width: metadata.width,
              height: metadata.height,
              format: metadata.format,
              checksum: imageChecksum,
              prompt: prompt || null,
              model: model || null,
              seed: seed || null,
            },
            {
              onConflict: 'generation_id,asset_id',
              ignoreDuplicates: false,
            },
          );

          if (upsertError) {
            throw classifySupabaseError(upsertError);
          }
        },
        { maxAttempts: 3 },
        { ...fullContext, operation: 'database_upsert' },
      );

      logger.info('Image uploaded successfully', {
        ...fullContext,
        url: publicUrl,
        width: metadata.width,
        height: metadata.height,
      });

      return {
        url: publicUrl,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        checksum: imageChecksum,
      };
    },
    [],
    { ...fullContext, operation: 'upload_with_cleanup' },
  );
}

// ============================================================================
// Mock Image Model Adapter
// ============================================================================

export class MockImageModelAdapter implements ImageModelAdapter {
  async generate(spec: ImagePromptSpec): Promise<{ data: Buffer; meta: GeneratedImageMeta }> {
    // Generate a deterministic solid color PNG based on the spec
    const color = this.getColorFromSpec(spec);
    const dimensions = this.getDimensionsFromAspect(spec.aspect);

    // Create a simple solid color image with embedded metadata
    const svg = `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              font-family="Arial" font-size="24" fill="${color === '#000000' ? '#ffffff' : '#000000'}">
          ${spec.id}
        </text>
        <text x="10" y="${dimensions.height - 10}" font-family="Arial" font-size="12" 
              fill="${color === '#000000' ? '#ffffff' : '#000000'}">
          ${spec.purpose} | ${spec.prompt.substring(0, 30)}...
        </text>
      </svg>
    `;

    // Convert SVG to PNG buffer
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const meta: GeneratedImageMeta = {
      model: 'mock-model-v1',
      seed: this.generateSeed(spec),
      width: dimensions.width,
      height: dimensions.height,
    };

    logger.info('Mock image generated', {
      specId: spec.id,
      purpose: spec.purpose,
      dimensions: `${dimensions.width}x${dimensions.height}`,
      seed: meta.seed,
    });

    return { data: buffer, meta };
  }

  private getColorFromSpec(spec: ImagePromptSpec): string {
    // Generate a deterministic color based on spec properties
    const hash = crypto
      .createHash('md5')
      .update(spec.id + spec.purpose + spec.prompt)
      .digest('hex');

    // Use first 6 chars as hex color
    return `#${hash.substring(0, 6)}`;
  }

  private getDimensionsFromAspect(aspect: ImagePromptSpec['aspect']): { width: number; height: number } {
    const aspectMap: Record<ImagePromptSpec['aspect'], { width: number; height: number }> = {
      '1:1': { width: 512, height: 512 },
      '4:3': { width: 512, height: 384 },
      '3:2': { width: 512, height: 341 },
      '2:3': { width: 341, height: 512 },
      '9:16': { width: 288, height: 512 },
    };

    return aspectMap[aspect];
  }

  private generateSeed(spec: ImagePromptSpec): string {
    // Generate deterministic seed from spec
    return crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex').substring(0, 8);
  }
}

// ============================================================================
// Production Image Model Adapter (Bridge to LangChain Pipeline)
// ============================================================================

import type { ImageModelAdapter as LangChainImageModelAdapter } from './langchain-pipeline/index.js';
import { pipelineConfig } from './langchain-pipeline/index.js';
import { autoConfigurePipeline } from './production-config.js';

/**
 * Production Image Model Adapter that bridges LangChain pipeline to ImageGenerationService
 * Converts LangChain's URL-based output to Buffer-based format expected by ImageGenerationService
 */
export class ProductionImageModelAdapter implements ImageModelAdapter {
  private langchainAdapter: LangChainImageModelAdapter;
  private initialized = false;

  constructor() {
    // Initialize pipeline configuration for production
    autoConfigurePipeline();
    this.langchainAdapter = pipelineConfig.adapters.image;
  }

  async generate(spec: ImagePromptSpec): Promise<{ data: Buffer; meta: GeneratedImageMeta }> {
    if (!this.initialized) {
      // Ensure pipeline is configured on first use
      autoConfigurePipeline();
      this.langchainAdapter = pipelineConfig.adapters.image;
      this.initialized = true;
    }

    // Convert ImagePromptSpec to ImageGenerateInput (LangChain format)
    const langchainInput = {
      id: spec.id,
      purpose: spec.purpose,
      prompt: spec.prompt,
      aspect: this.mapAspectRatio(spec.aspect),
      negativePrompt: spec.negativePrompt,
      guidance: spec.guidance,
    };

    // Generate image using LangChain adapter (returns URL)
    const langchainOutput = await this.langchainAdapter.generate(langchainInput);

    // Fetch image data from URL and convert to Buffer
    const imageResponse = await fetch(langchainOutput.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    // Return in format expected by ImageGenerationService
    return {
      data,
      meta: {
        model: 'dall-e-3',
        seed: langchainOutput.id,
        width: langchainOutput.width,
        height: langchainOutput.height,
      },
    };
  }

  /**
   * Maps aspect ratio from ImageGenerationService format to LangChain format
   */
  private mapAspectRatio(aspect: ImagePromptSpec['aspect']): '1:1' | '3:2' | '4:3' | '16:9' | '2:3' | '3:4' {
    const aspectMap: Record<ImagePromptSpec['aspect'], '1:1' | '3:2' | '4:3' | '16:9' | '2:3' | '3:4'> = {
      '1:1': '1:1',
      '3:2': '3:2',
      '4:3': '4:3',
      '2:3': '2:3',
      '9:16': '2:3', // Map 9:16 (portrait) to closest portrait ratio supported by LangChain
    };

    // Log approximation for transparency
    if (aspect === '9:16') {
      logger.info('Aspect ratio approximated for LangChain compatibility', {
        requested: aspect,
        mapped: '2:3',
        note: 'LangChain does not support 9:16, using closest portrait ratio 2:3',
      });
    }

    return aspectMap[aspect];
  }
}
