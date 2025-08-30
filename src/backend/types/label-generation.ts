// Phase 1.3.2: Backend Processing Pipeline Types

import type * as DesignSchema from './design-schema.js';

export type LabelStyleId = 'classic' | 'modern' | 'elegant' | 'funky';

// Label generation - stateful process entity tracking the entire pipeline
export interface LabelGeneration {
  id: string;
  submissionId: string; // Foreign key to WineLabelSubmission
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phase?: 'design-scheme' | 'image-prompts' | 'image-generate' | 'detailed-layout' | 'render' | 'refine'; // Current pipeline phase
  designScheme?: DesignSchema.DesignSchema; // Output of design-scheme step
  description?: LabelDSL; // Final DSL output when detailed-layout complete
  previewUrl?: string; // URL to rendered label preview (set when render phase completes)
  previewWidth?: number; // Width of rendered preview in pixels
  previewHeight?: number; // Height of rendered preview in pixels
  previewFormat?: 'PNG' | 'JPEG' | 'WebP'; // Format of rendered preview
  error?: string; // Error message if failed
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Phase 1: Design Scheme - High-level design description (output of design-scheme step)
// Types are defined in design-schema.ts and imported via namespace

// QStash job types
export interface LabelGenerationJob {
  submissionId: string;
  style: LabelStyleId;
  wineData: {
    producerName: string;
    wineName: string;
    vintage: string;
    variety: string;
    region: string;
    appellation: string;
  };
}

// API Response types
export interface SubmitWineLabelResponse {
  submissionId: string;
  generationId: string;
  statusUrl: string;
  queueMessageId?: string;
}

export interface GenerationStatusResponse {
  id: string;
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phase?: 'design-scheme' | 'image-prompts' | 'image-generate' | 'detailed-layout' | 'render' | 'refine';
  designScheme?: DesignSchema.DesignSchema; // Present when design-scheme phase complete
  description?: LabelDSL; // Present when detailed-layout phase complete
  previewUrl?: string; // Present when render phase complete
  previewWidth?: number; // Present when render phase complete
  previewHeight?: number; // Present when render phase complete
  previewFormat?: 'PNG' | 'JPEG' | 'WebP'; // Present when render phase complete
  error?: string; // Present if failed
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Type guards
export function isValidLabelStyle(style: string): style is LabelStyleId {
  return ['classic', 'modern', 'elegant', 'funky'].includes(style);
}

// Backwards compatibility alias
export type LabelDescription = DesignSchema.DesignSchema;

// Transformation functions for pipeline phases
export function designSchemeToBaseLabelDSL(designScheme: DesignSchema.DesignSchema): Partial<LabelDSL> {
  return {
    version: '1' as const,
    canvas: {
      width: 800,
      height: 1200,
      dpi: 300,
      background: designScheme.palette.background.hex,
    },
    palette: {
      primary: designScheme.palette.primary.hex,
      secondary: designScheme.palette.secondary.hex,
      accent: designScheme.palette.accent.hex,
      background: designScheme.palette.background.hex,
      temperature: designScheme.palette.temperature,
      contrast: designScheme.palette.contrast,
    },
    typography: {
      primary: {
        family: designScheme.typography.primary.family,
        weight: designScheme.typography.primary.weight,
        style: designScheme.typography.primary.style,
        letterSpacing: designScheme.typography.primary.letterSpacing,
      },
      secondary: {
        family: designScheme.typography.secondary.family,
        weight: designScheme.typography.secondary.weight,
        style: designScheme.typography.secondary.style,
        letterSpacing: designScheme.typography.secondary.letterSpacing,
      },
      hierarchy: designScheme.typography.hierarchy,
    },
    assets: [],
    elements: [], // Will be populated in detailed-layout phase
  };
}

// ============================================================================
// Phase 1: Design Scheme Zod Validators
// ============================================================================
// Validators are now defined in design-schema.ts and can be imported as needed
// Re-export the main validator for convenience
export { DesignSchemaSchema } from './design-schema.js';

// ============================================================================
// Phase 1.3.4.2: Label DSL (JSON) Schema Types
// ============================================================================

import { z } from 'zod';

const BoundsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

const CanvasSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().int().positive().default(144),
  background: z.string(),
});

const PaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  temperature: z.enum(['warm', 'cool', 'neutral']),
  contrast: z.enum(['high', 'medium', 'low']),
});

const TypographyKeySchema = z.enum(['primary', 'secondary']);

const TypographyFontSchema = z.object({
  family: z.string(),
  weight: z.number().min(100).max(900),
  style: z.enum(['normal', 'italic']),
  letterSpacing: z.number(),
});

const LabelTextHierarchySchema = z.object({
  producerEmphasis: z.enum(['dominant', 'balanced', 'subtle']),
  vintageProminence: z.enum(['featured', 'standard', 'minimal']),
  regionDisplay: z.enum(['prominent', 'integrated', 'subtle']),
});

const TypographySystemSchema = z.object({
  primary: TypographyFontSchema,
  secondary: TypographyFontSchema,
  hierarchy: LabelTextHierarchySchema,
});

const FontResourcesSchema = z.object({
  primaryUrl: z.url().optional(),
  secondaryUrl: z.url().optional(),
});

const AssetSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  url: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const ElementBaseSchema = z.object({
  id: z.string(),
  bounds: BoundsSchema,
  z: z.number().int().min(0).max(1000),
});

const TextTransformSchema = z.enum(['uppercase', 'lowercase', 'none']);

const TextElementSchema = ElementBaseSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  font: TypographyKeySchema,
  color: z.enum(['primary', 'secondary', 'accent', 'background']),
  align: z.enum(['left', 'center', 'right']).default('left'),
  fontSize: z.number().int().positive(),
  lineHeight: z.number().positive().default(1.2),
  maxLines: z.number().int().min(1).max(10).default(1),
  textTransform: TextTransformSchema.default('none'),
});

const ImageElementSchema = ElementBaseSchema.extend({
  type: z.literal('image'),
  assetId: z.string(),
  fit: z.enum(['contain', 'cover', 'fill']).default('contain'),
  opacity: z.number().min(0).max(1).default(1),
  rotation: z.number().min(-180).max(180).default(0),
});

const ShapeElementSchema = ElementBaseSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rect', 'line']),
  color: z.enum(['primary', 'secondary', 'accent', 'background']),
  strokeWidth: z.number().min(0).max(20).default(0),
  rotation: z.number().min(-180).max(180).default(0),
});

const ElementSchema = z.discriminatedUnion('type', [TextElementSchema, ImageElementSchema, ShapeElementSchema]);

export const LabelDSLSchema = z
  .object({
    version: z.literal('1'),
    canvas: CanvasSchema,
    palette: PaletteSchema,
    typography: TypographySystemSchema,
    fonts: FontResourcesSchema.optional(),
    assets: z.array(AssetSchema).default([]),
    elements: z.array(ElementSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // Validate that all image elements reference existing assets
    const assetIds = new Set(data.assets.map((asset) => asset.id));

    data.elements.forEach((element, index) => {
      if (element.type === 'image' && !assetIds.has(element.assetId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Asset with id '${element.assetId}' not found in assets array`,
          path: ['elements', index, 'assetId'],
        });
      }
    });
  });

// Label DSL type exports
export type LabelDSL = z.infer<typeof LabelDSLSchema>;
export type Element = z.infer<typeof ElementSchema>;
