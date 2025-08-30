/**
 * Centralized asset type constants and utilities
 * Provides type-safe asset creation helpers to ensure schema consistency
 */

import type { ImageGenerateOutput } from '../schema/langchain-pipeline-schemas.js';

export const ASSET_TYPE = {
  IMAGE: 'image',
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

/**
 * Helper function to create type-safe image assets
 * Ensures all image assets have consistent structure with required 'type' field
 */
export function createImageAsset(id: string, url: string, width: number, height: number): ImageGenerateOutput {
  return {
    id,
    type: ASSET_TYPE.IMAGE,
    url,
    width,
    height,
  };
}

/**
 * Type guard to validate image asset structure at runtime
 */
export function isImageAsset(asset: unknown): asset is ImageGenerateOutput {
  if (typeof asset !== 'object' || asset === null) {
    return false;
  }

  const obj = asset as Record<string, unknown>;

  return (
    'type' in obj &&
    obj.type === ASSET_TYPE.IMAGE &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'url' in obj &&
    typeof obj.url === 'string' &&
    'width' in obj &&
    typeof obj.width === 'number' &&
    'height' in obj &&
    typeof obj.height === 'number'
  );
}
