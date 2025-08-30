/**
 * Asset utilities for wine label generation
 * Provides reusable functions for asset type inference, ID generation, and metadata handling
 */

export interface AssetMetadata {
  id: string;
  type: string;
  width: number;
  height: number;
  aspectRatio: string;
  orientation: 'landscape' | 'portrait' | 'square';
  purpose: string;
}

/**
 * Infer asset type from asset ID using consistent mapping
 */
export function inferAssetType(assetId: string): string {
  const typeMap: Record<string, string> = {
    logo: 'Logo/Brand element',
    pattern: 'Decorative pattern',
    texture: 'Texture/Background',
    background: 'Background element',
    foreground: 'Foreground element',
    decoration: 'Decorative element',
    hero: 'Hero image',
    accent: 'Accent element',
    vintage: 'Vintage element',
  };

  const matchedType = Object.entries(typeMap).find(([key]) => assetId.toLowerCase().includes(key));

  return matchedType ? matchedType[1] : 'Design element';
}

/**
 * Generate comprehensive asset metadata for LLM prompts
 */
export function generateAssetMetadata(asset: { id: string; width: number; height: number }): AssetMetadata {
  const aspectRatio = (asset.width / asset.height).toFixed(2);
  const orientation = asset.width > asset.height ? 'landscape' : asset.width < asset.height ? 'portrait' : 'square';
  const purpose = asset.id.split('-')[0] || 'general';

  return {
    id: asset.id,
    type: inferAssetType(asset.id),
    width: asset.width,
    height: asset.height,
    aspectRatio,
    orientation,
    purpose,
  };
}

/**
 * Generate token-optimized asset descriptions for LLM prompts
 */
export function generateAssetDescriptions(
  assets: Array<{ id: string; type?: string; url?: string; width: number; height: number }>,
): string {
  return assets
    .map((asset, i) => {
      const metadata = generateAssetMetadata(asset);
      const copyFormat =
        asset.url && asset.type
          ? `{ "id": "${asset.id}", "type": "${asset.type}", "url": "${asset.url}", "width": ${asset.width}, "height": ${asset.height} }`
          : `ID: ${metadata.id}, Type: ${metadata.type}, Size: ${metadata.width}x${metadata.height}px`;
      return `${i + 1}. ${copyFormat}`;
    })
    .join('\n');
}

/**
 * Generate detailed asset descriptions with full metadata
 */
export function generateDetailedAssetDescriptions(
  assets: Array<{ id: string; width: number; height: number }>,
): string {
  return assets
    .map((asset, i) => {
      const metadata = generateAssetMetadata(asset);
      return `${i + 1}. ID: ${metadata.id}
   Type: ${metadata.type}
   Dimensions: ${metadata.width}x${metadata.height}px (${metadata.orientation}, ratio ${metadata.aspectRatio})
   Purpose: ${metadata.purpose}`;
    })
    .join('\n\n');
}
