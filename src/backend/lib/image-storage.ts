// Phase 1.3.4.3: Image Storage Management and CDN Setup

import { supabase } from './database.js';
import { logger } from './logger.js';

// ============================================================================
// Storage Bucket Management
// ============================================================================

export async function initializeImageStorage(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      logger.error('Failed to list storage buckets:', listError);
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === 'label-images');

    if (!bucketExists) {
      // Create the bucket
      const { error } = await supabase.storage.createBucket('label-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });

      if (error) {
        logger.error('Failed to create storage bucket:', error);
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      logger.info('Storage bucket "label-images" created successfully');
    } else {
      logger.info('Storage bucket "label-images" already exists');
    }

    // Verify bucket access
    await verifyBucketAccess();
  } catch (error) {
    logger.error('Storage initialization failed:', error);
    throw error;
  }
}

async function verifyBucketAccess(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Try to list files in the bucket (should work even if empty)
    const { error } = await supabase.storage.from('label-images').list('', { limit: 1 });

    if (error) {
      logger.error('Bucket access verification failed:', error);
      throw new Error(`Cannot access bucket: ${error.message}`);
    }

    logger.info('Storage bucket access verified successfully');
  } catch (error) {
    logger.error('Bucket access verification failed:', error);
    throw error;
  }
}

// ============================================================================
// CORS and Cache Configuration Helper
// ============================================================================

export function getStorageConfiguration() {
  return {
    bucketName: 'label-images',
    cacheHeaders: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    corsSettings: {
      allowedOrigins: ['http://localhost:3000', 'https://winette.vercel.app'],
      allowedMethods: ['GET'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAgeSeconds: 3600,
    },
  };
}

// ============================================================================
// Storage URL Helpers
// ============================================================================

/**
 * Generate content-addressable storage path.
 * Uses full checksum for global deduplication - same content = same URL everywhere.
 */
export function getContentAddressablePath(checksum: string, format: string): string {
  return `content/${checksum}.${format}`;
}

/**
 * @deprecated Use getContentAddressablePath for new content-addressable storage.
 * This exists for backward compatibility with existing tests.
 */
export function getStoragePath(generationId: string, assetId: string, format: string, checksum?: string): string {
  if (checksum) {
    return `gen/${generationId}/${assetId}-${checksum.substring(0, 12)}.${format}`;
  }
  return `gen/${generationId}/${assetId}.${format}`;
}

export function getPublicUrl(path: string): string | null {
  if (!supabase) {
    logger.error('Supabase client not initialized');
    return null;
  }

  const { data } = supabase.storage.from('label-images').getPublicUrl(path);

  return data.publicUrl;
}
