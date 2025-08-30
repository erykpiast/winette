// Shared constants and types used across the frontend application

export const IMAGE_FORMATS = ['PNG', 'JPEG', 'WebP'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const WINE_LABEL_STYLES = ['classic', 'modern', 'elegant', 'funky'] as const;
export type WineLabelStyle = (typeof WINE_LABEL_STYLES)[number];

export const GENERATION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type GenerationStatusType = (typeof GENERATION_STATUSES)[number];

export const GENERATION_PHASES = [
  'design-scheme',
  'image-prompts',
  'image-generate',
  'detailed-layout',
  'render',
  'refine',
] as const;
export type GenerationPhase = (typeof GENERATION_PHASES)[number];
