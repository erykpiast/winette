import {
  type DesignSchemeInput,
  DesignSchemeInputSchema,
  type DesignSchemeOutput,
  DesignSchemeOutputSchema,
  type DetailedLayoutInput,
  DetailedLayoutInputSchema,
  type DetailedLayoutOutput,
  DetailedLayoutOutputSchema,
  type ImageGenerateInput,
  type ImageGenerateOutput,
  type ImagePromptsInput,
  ImagePromptsInputSchema,
  type ImagePromptsOutput,
  ImagePromptsOutputSchema,
  type RefineInput,
  RefineInputSchema,
  type RefineOutput,
  RefineOutputSchema,
} from '#backend/schema/langchain-pipeline-schemas.js';
import {
  type ImageModelAdapter,
  invokeStructuredLLM,
  pipelineConfig,
  type VisionRefinerAdapter,
} from './langchain-pipeline.js';
import { logger } from './logger.js';

// ============================================================================
// Step 1: Design Scheme Chain
// ============================================================================

const DESIGN_SCHEME_PROMPT = `You are a professional wine label designer creating a design scheme for a wine label.

Wine Details:
- Producer: {producerName}
- Wine Name: {wineName} 
- Vintage: {vintage}
- Variety: {variety}
- Region: {region}
- Appellation: {appellation}

Style Direction: {style}

Create a comprehensive design scheme following this EXACT JSON structure:
{{
  "version": "1",
  "canvas": {{
    "width": 750,      // Width in pixels (typically 750-1000)
    "height": 1000,    // Height in pixels (typically 1000-1500)
    "dpi": 300,        // DPI (typically 144-300)
    "background": "#FFFFFF"  // Background color as hex string
  }},
  "palette": {{
    "primary": "#722F37",    // Primary color as hex string
    "secondary": "#D4AF37",  // Secondary color as hex string
    "accent": "#2F4F2F",     // Accent color as hex string
    "background": "#F5F5DC", // Background color as hex string (should match canvas.background)
    "temperature": "warm",   // Must be "warm", "cool", or "neutral"
    "contrast": "medium"     // Must be "high", "medium", or "low"
  }},
  "typography": {{
    "primary": {{
      "family": "serif",     // Font family name (e.g., "serif", "sans-serif", "Georgia", etc.)
      "weight": 600,         // Font weight (100-900)
      "style": "normal",     // Must be "normal" or "italic"
      "letterSpacing": 0     // Letter spacing in em units
    }},
    "secondary": {{
      "family": "sans-serif",
      "weight": 400,
      "style": "normal",
      "letterSpacing": 0.3
    }},
    "hierarchy": {{
      "producerEmphasis": "balanced",     // Must be "dominant", "balanced", or "subtle"
      "vintageProminence": "featured",    // Must be "featured", "standard", or "minimal"
      "regionDisplay": "integrated"       // Must be "prominent", "integrated", or "subtle"
    }}
  }},
  "assets": []  // Must be empty array
}}

Consider the wine's characteristics and target market. Use colors that reflect the wine variety and region.
For {style} style, apply appropriate design principles:
- classic: traditional, elegant, serif fonts, muted colors
- modern: clean, minimalist, sans-serif fonts, bold contrasts  
- elegant: sophisticated, refined, script fonts, luxurious colors
- funky: creative, playful, unique fonts, vibrant colors

IMPORTANT: All color values MUST be valid hex strings (e.g., "#FF0000"). Do NOT use objects for colors.`;

export async function runDesignScheme(input: DesignSchemeInput): Promise<DesignSchemeOutput> {
  logger.info('Running design-scheme step', {
    producerName: input.submission.producerName,
    style: input.style,
  });

  return await invokeStructuredLLM(
    'design-scheme',
    DESIGN_SCHEME_PROMPT,
    {
      ...input.submission,
      style: input.style,
    },
    DesignSchemeOutputSchema,
    DesignSchemeInputSchema,
    input,
  );
}

// ============================================================================
// Step 2: Image Prompts Chain
// ============================================================================

const IMAGE_PROMPTS_PROMPT = `You are an AI image generation prompt engineer creating prompts for wine label imagery.

Based on this design scheme:
- Palette: Primary {primary}, Secondary {secondary}, Accent {accent}, Background {background}
- Temperature: {temperature}, Contrast: {contrast}
- Typography: Primary font {primaryFont}, Secondary font {secondaryFont}

Create 2-4 image generation prompts that will complement this design scheme.
Each prompt should specify:
- id: unique identifier
- purpose: "background", "foreground", or "decoration" 
- prompt: detailed description for image generation
- negativePrompt: what to avoid (optional)
- guidance: creativity level 1-20 (optional, default 7.5)
- aspect: aspect ratio from ["1:1", "3:2", "4:3", "16:9", "2:3", "3:4"]

Consider the wine's characteristics and design style. Create prompts for:
1. A primary background or hero image
2. Supporting decorative elements
3. Additional accent imagery if needed

Make prompts specific and detailed for best image generation results.
Avoid copyrighted content, text overlays, or specific brand references.

Return expectedPrompts count and the prompts array.`;

export async function runImagePrompts(input: ImagePromptsInput): Promise<ImagePromptsOutput> {
  logger.info('Running image-prompts step', {
    paletteTemp: input.palette.temperature,
  });

  return await invokeStructuredLLM(
    'image-prompts',
    IMAGE_PROMPTS_PROMPT,
    {
      primary: input.palette.primary,
      secondary: input.palette.secondary,
      accent: input.palette.accent,
      background: input.palette.background,
      temperature: input.palette.temperature,
      contrast: input.palette.contrast,
      primaryFont: input.typography.primary.family,
      secondaryFont: input.typography.secondary.family,
    },
    ImagePromptsOutputSchema,
    ImagePromptsInputSchema,
    input,
  );
}

// ============================================================================
// Step 3: Image Generate (Using Adapter)
// ============================================================================

export async function runImageGenerate(
  input: ImageGenerateInput,
  adapter: ImageModelAdapter = pipelineConfig.adapters.image,
): Promise<ImageGenerateOutput> {
  logger.info('Running image-generate step', {
    promptId: input.id,
    purpose: input.purpose,
  });

  return await adapter.generate(input);
}

// ============================================================================
// Step 4: Detailed Layout Chain
// ============================================================================

const DETAILED_LAYOUT_PROMPT = `You are a wine label layout designer creating the final element positioning.

You have this base design with generated assets:
- Canvas: {width}x{height} pixels, DPI {dpi}, Background: {background}
- Palette: Primary {primary}, Secondary {secondary}, Accent {accent} 
- Assets available: {assetCount} images

Asset Details:
{assetDetails}

Typography System:
- Primary: {primaryFont} {primaryWeight} {primaryStyle}
- Secondary: {secondaryFont} {secondaryWeight} {secondaryStyle}
- Hierarchy: Producer emphasis {producerEmphasis}, Vintage prominence {vintageProminence}, Region display {regionDisplay}

Create a complete LabelDSL following this EXACT JSON structure:
{{
  "version": "1",
  "canvas": {{
    "width": {width},
    "height": {height},
    "dpi": {dpi},
    "background": "{background}"
  }},
  "palette": {{
    "primary": "{primary}",
    "secondary": "{secondary}",
    "accent": "{accent}",
    "background": "{background}",
    "temperature": "{temperature}",
    "contrast": "{contrast}"
  }},
  "typography": {{
    "primary": {{
      "family": "{primaryFont}",
      "weight": {primaryWeight},
      "style": "{primaryStyle}",
      "letterSpacing": 0
    }},
    "secondary": {{
      "family": "{secondaryFont}",
      "weight": {secondaryWeight},
      "style": "{secondaryStyle}",
      "letterSpacing": 0.3
    }},
    "hierarchy": {{
      "producerEmphasis": "{producerEmphasis}",
      "vintageProminence": "{vintageProminence}",
      "regionDisplay": "{regionDisplay}"
    }}
  }},
  "assets": [
    // Copy all assets exactly as provided in the Asset Details above
    // Each asset must have: id, type, url, width, height
  ],
  "elements": [
    {{
      "id": "producer_text",
      "type": "text",
      "text": "Producer Name",
      "bounds": {{ "x": 0.5, "y": 0.1, "w": 0.8, "h": 0.08 }},
      "z": 100,
      "font": "primary",              // Must be "primary" or "secondary"
      "color": "primary",             // Must be "primary", "secondary", "accent", or "background"
      "align": "center",              // Must be "left", "center", or "right"
      "fontSize": 48,
      "lineHeight": 1.2,
      "maxLines": 2,
      "textTransform": "uppercase"    // Must be "uppercase", "lowercase", or "none"
    }},
    {{
      "id": "background_image",
      "type": "image",
      "assetId": "use_actual_asset_id_here",
      "bounds": {{ "x": 0, "y": 0, "w": 1, "h": 0.7 }},
      "z": 1,
      "fit": "cover",
      "opacity": 0.8,
      "rotation": 0
    }},
    {{
      "id": "decoration_image", 
      "type": "image",
      "assetId": "use_actual_asset_id_here",
      "bounds": {{ "x": 0.7, "y": 0.7, "w": 0.25, "h": 0.25 }},
      "z": 10,
      "fit": "contain", 
      "opacity": 1.0,
      "rotation": 0
    }},
    {{
      "id": "divider_line",
      "type": "shape",
      "shape": "line",                // Must be "rect" or "line"
      "bounds": {{ "x": 0.1, "y": 0.5, "w": 0.8, "h": 0.01 }},
      "z": 50,
      "color": "accent",              // Must be "primary", "secondary", "accent", or "background"
      "strokeWidth": 2,
      "rotation": 0
    }}
  ]
}}

Position elements using relative coordinates (0-1 range for x, y, w, h).
Set appropriate z-index values (0-1000) for layering.
Use the typography hierarchy settings to determine text sizing and prominence.

IMPORTANT: 
- Include ALL wine information as text elements
- Create exactly {assetCount} image elements using the asset IDs from Asset Details above
- Every asset must be referenced exactly once - no unused assets allowed
- All enum values are case-sensitive and must match schema exactly
- DO NOT include comments in the final JSON`;

export async function runDetailedLayout(input: DetailedLayoutInput): Promise<DetailedLayoutOutput> {
  logger.info('Running detailed-layout step', {
    canvasSize: `${input.canvas.width}x${input.canvas.height}`,
    assetCount: input.assets.length,
  });

  const assetDetails = input.assets
    .map((asset, i) => `${i + 1}. ID: ${asset.id}, Size: ${asset.width}x${asset.height}, URL: ${asset.url}`)
    .join('\n');

  return await invokeStructuredLLM(
    'detailed-layout',
    DETAILED_LAYOUT_PROMPT,
    {
      width: input.canvas.width,
      height: input.canvas.height,
      dpi: input.canvas.dpi,
      background: input.canvas.background,
      primary: input.palette.primary,
      secondary: input.palette.secondary,
      accent: input.palette.accent,
      assetCount: input.assets.length,
      assetDetails,
      primaryFont: input.typography.primary.family,
      primaryWeight: input.typography.primary.weight,
      primaryStyle: input.typography.primary.style,
      secondaryFont: input.typography.secondary.family,
      secondaryWeight: input.typography.secondary.weight,
      secondaryStyle: input.typography.secondary.style,
      producerEmphasis: input.typography.hierarchy.producerEmphasis,
      vintageProminence: input.typography.hierarchy.vintageProminence,
      regionDisplay: input.typography.hierarchy.regionDisplay,
      temperature: input.palette.temperature,
      contrast: input.palette.contrast,
    },
    DetailedLayoutOutputSchema,
    DetailedLayoutInputSchema,
    input,
  );
}

// ============================================================================
// Step 5: Render (Mock Implementation)
// ============================================================================

export async function runRender(input: DetailedLayoutOutput) {
  logger.info('Running render step (mock)', {
    elementCount: input.elements?.length ?? 0,
  });

  // Mock implementation - in production this would use the actual renderer
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate render time

  return {
    previewUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    width: input.canvas.width,
    height: input.canvas.height,
    format: 'PNG' as const,
  };
}

// ============================================================================
// Step 6: Refine Chain (Using Vision Adapter)
// ============================================================================

const REFINE_PROMPT = `You are a wine label design critic providing refinement suggestions.

Wine Details:
- Producer: {producerName}
- Wine Name: {wineName}
- Vintage: {vintage}
- Variety: {variety}

Current Design Analysis:
You are looking at a wine label preview image. The current label has these specifications:
- Canvas: {width}x{height}
- Elements: {elementCount} total elements
- Palette: {primaryColor} primary, {secondaryColor} secondary

Task: Analyze the visual design and suggest up to 5 specific edit operations to improve the label.

Consider:
- Visual hierarchy and readability
- Color balance and contrast  
- Element positioning and spacing
- Typography appropriateness
- Overall aesthetic coherence
- Brand positioning for the wine type

Provide edit operations from these types:
- update_palette: Change a palette color
- update_typography: Modify font properties  
- update_element: Adjust element properties (bounds, fontSize, color, text, opacity, rotation)
- add_element: Add a new element
- remove_element: Remove an element by ID

Be conservative - only suggest changes that clearly improve the design.
Include reasoning for each suggested change.
Rate your confidence in the improvements (0-1).

Return operations array (max 10), reasoning, and confidence score.`;

export async function runRefine(
  input: RefineInput,
  adapter: VisionRefinerAdapter = pipelineConfig.adapters.vision,
): Promise<RefineOutput> {
  logger.info('Running refine step', {
    producerName: input.submission.producerName,
    previewUrl: input.previewUrl,
  });

  // Use vision adapter if available, otherwise use LLM-based analysis
  if (adapter) {
    return await adapter.proposeEdits(input);
  }

  // Fallback to text-based analysis
  return await invokeStructuredLLM(
    'refine',
    REFINE_PROMPT,
    {
      ...input.submission,
      width: input.currentDSL.canvas.width,
      height: input.currentDSL.canvas.height,
      elementCount: input.currentDSL.elements.length,
      primaryColor: input.currentDSL.palette.primary,
      secondaryColor: input.currentDSL.palette.secondary,
    },
    RefineOutputSchema,
    RefineInputSchema,
    input,
  );
}

// ============================================================================
// Chain Function Registry
// ============================================================================

export const chains = {
  'design-scheme': runDesignScheme,
  'image-prompts': runImagePrompts,
  'image-generate': runImageGenerate,
  'detailed-layout': runDetailedLayout,
  render: runRender,
  refine: runRefine,
} as const;

export type ChainFunction = (typeof chains)[keyof typeof chains];
