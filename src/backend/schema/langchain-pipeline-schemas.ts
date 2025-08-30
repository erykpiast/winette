import { z } from 'zod';
import { LabelDSLSchema } from '../types/label-generation.js';

// ============================================================================
// Base Types and Enums
// ============================================================================

const LabelStyleSchema = z.enum(['classic', 'modern', 'elegant', 'funky']);

const AspectRatioSchema = z.enum(['1:1', '3:2', '4:3', '16:9', '2:3', '3:4']);

const ImagePurposeSchema = z.enum(['background', 'foreground', 'decoration']);

// Shared wine submission schema to avoid duplication across pipeline steps
export const WineSubmissionSchema = z.object({
  producerName: z.string().min(1, 'Producer name is required'),
  wineName: z.string().min(1, 'Wine name is required'),
  vintage: z.string().regex(/^\d{4}$/, 'Vintage must be a 4-digit year'),
  variety: z.string().min(1, 'Variety is required'),
  region: z.string().min(1, 'Region is required'),
  appellation: z.string().min(1, 'Appellation is required'),
});

export type WineSubmission = z.infer<typeof WineSubmissionSchema>;

// ============================================================================
// Step 1: Design Scheme
// ============================================================================

export const DesignSchemeInputSchema = z.object({
  submission: WineSubmissionSchema,
  style: LabelStyleSchema,
  historicalExamples: z.array(z.unknown()).optional(), // Few-shot examples
});

// Output: LabelDSL core without elements and with empty assets
export const DesignSchemeOutputSchema = LabelDSLSchema.omit({
  elements: true,
}).extend({
  assets: z.array(z.never()).length(0), // Must be empty array
});

// ============================================================================
// Step 2: Image Prompts
// ============================================================================

export const ImagePromptsInputSchema = DesignSchemeOutputSchema.extend({
  style: LabelStyleSchema, // Pass through style from design-scheme step for style-aware image generation
  submission: WineSubmissionSchema, // Wine submission data needed for generating contextual image prompts
});

const ImagePromptSpecSchema = z.object({
  id: z.string(),
  purpose: ImagePurposeSchema,
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  guidance: z.number().min(1).max(20).optional(),
  aspect: AspectRatioSchema,
});

export const ImagePromptsOutputSchema = z
  .object({
    expectedPrompts: z.number().int().min(0),
    prompts: z.array(ImagePromptSpecSchema),
  })
  .refine((data) => data.prompts.length === data.expectedPrompts, {
    message: 'Number of prompts must match expectedPrompts count',
    path: ['prompts'],
  });

// ============================================================================
// Step 3: Image Generate
// ============================================================================

export const ImageGenerateInputSchema = ImagePromptSpecSchema;

const GeneratedAssetSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const ImageGenerateOutputSchema = GeneratedAssetSchema;

// ============================================================================
// Step 4: Detailed Layout
// ============================================================================

export const DetailedLayoutInputSchema = LabelDSLSchema.omit({
  elements: true,
}).extend({
  assets: z.array(GeneratedAssetSchema).min(1), // Must have at least one asset
  submission: WineSubmissionSchema,
  style: LabelStyleSchema, // Pass through style from design-scheme step
});

// Output: Full DSL with elements populated
export const DetailedLayoutOutputSchema = LabelDSLSchema.superRefine((data, ctx) => {
  // Must have elements populated
  if (!data.elements || data.elements.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Elements array must be populated in detailed-layout step',
      path: ['elements'],
    });
  }

  // All assets must be referenced by at least one image element (if any image elements exist)
  const assetIds = new Set(data.assets.map((asset) => asset.id));
  const imageElements = data.elements?.filter((el) => el.type === 'image') as Array<{ type: 'image'; assetId: string }>;
  const referencedAssetIds = new Set(imageElements?.map((el) => el.assetId) ?? []);

  const unreferencedAssets = [...assetIds].filter((id) => !referencedAssetIds.has(id));
  if (unreferencedAssets.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Assets not referenced by any element: ${unreferencedAssets.join(', ')}`,
      path: ['assets'],
    });
  }
});

// ============================================================================
// Step 5: Render
// ============================================================================

export const RenderInputSchema = LabelDSLSchema;

export const RenderOutputSchema = z.object({
  previewUrl: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(['PNG', 'JPEG', 'WebP']).default('PNG'),
});

// ============================================================================
// Step 6: Refine
// ============================================================================

const EditOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('update_palette'),
    target: z.enum(['primary', 'secondary', 'accent', 'background']),
    value: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
  }),
  z.object({
    type: z.literal('update_typography'),
    target: z.enum(['primary', 'secondary']),
    property: z.enum(['family', 'weight', 'style', 'letterSpacing']),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    type: z.literal('update_element'),
    elementId: z.string(),
    property: z.enum(['bounds', 'fontSize', 'color', 'text', 'opacity', 'rotation']),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('add_element'),
    element: z
      .object({
        id: z.string(),
        type: z.enum(['text', 'image', 'shape']),
        bounds: z.object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          w: z.number().min(0).max(1),
          h: z.number().min(0).max(1),
        }),
        z: z.number().int().min(0).max(1000),
      })
      .passthrough(), // Allow additional properties for specific element types
  }),
  z.object({
    type: z.literal('remove_element'),
    elementId: z.string(),
  }),
]);

export const RefineInputSchema = z.object({
  submission: WineSubmissionSchema,
  currentDSL: LabelDSLSchema,
  previewUrl: z.string().url(),
  refinementFeedback: z.string().optional(),
});

export const RefineOutputSchema = z.object({
  operations: z.array(EditOperationSchema).max(10), // Bounded operations
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Utility Types and Exports
// ============================================================================

export type DesignSchemeInput = z.infer<typeof DesignSchemeInputSchema>;
export type DesignSchemeOutput = z.infer<typeof DesignSchemeOutputSchema>;

export type ImagePromptsInput = z.infer<typeof ImagePromptsInputSchema>;
export type ImagePromptsOutput = z.infer<typeof ImagePromptsOutputSchema>;
export type ImagePromptSpec = z.infer<typeof ImagePromptSpecSchema>;

export type ImageGenerateInput = z.infer<typeof ImageGenerateInputSchema>;
export type ImageGenerateOutput = z.infer<typeof ImageGenerateOutputSchema>;

export type DetailedLayoutInput = z.infer<typeof DetailedLayoutInputSchema>;
export type DetailedLayoutOutput = z.infer<typeof DetailedLayoutOutputSchema>;

export type RenderInput = z.infer<typeof RenderInputSchema>;
export type RenderOutput = z.infer<typeof RenderOutputSchema>;

export type RefineInput = z.infer<typeof RefineInputSchema>;
export type RefineOutput = z.infer<typeof RefineOutputSchema>;
export type EditOperation = z.infer<typeof EditOperationSchema>;

// Pipeline step union type for orchestration
export const PipelineStepSchema = z.enum([
  'design-scheme',
  'image-prompts',
  'image-generate',
  'detailed-layout',
  'render',
  'refine',
]);

export type PipelineStep = z.infer<typeof PipelineStepSchema>;

// ============================================================================
// Schema Validation Helpers
// ============================================================================

export const StepSchemas = {
  'design-scheme': {
    input: DesignSchemeInputSchema,
    output: DesignSchemeOutputSchema,
  },
  'image-prompts': {
    input: ImagePromptsInputSchema,
    output: ImagePromptsOutputSchema,
  },
  'image-generate': {
    input: ImageGenerateInputSchema,
    output: ImageGenerateOutputSchema,
  },
  'detailed-layout': {
    input: DetailedLayoutInputSchema,
    output: DetailedLayoutOutputSchema,
  },
  render: {
    input: RenderInputSchema,
    output: RenderOutputSchema,
  },
  refine: {
    input: RefineInputSchema,
    output: RefineOutputSchema,
  },
} as const;

// Utility function to validate step input/output
export function validateStepData<T extends PipelineStep>(step: T, data: unknown, direction: 'input' | 'output') {
  const schema = StepSchemas[step][direction];
  return schema.safeParse(data);
}
