import {
  type ImagePromptsInput,
  ImagePromptsInputSchema,
  type ImagePromptsOutput,
  ImagePromptsOutputSchema,
} from '#backend/schema/langchain-pipeline-schemas.js';
import { invokeStructuredLLM } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';
import { formatWineDetailsPlaceholders, getImagePromptGuidelines } from './prompt-constants.js';

const IMAGE_PROMPTS_PROMPT = `You are an AI image generation prompt engineer creating prompts for wine label imagery.

${formatWineDetailsPlaceholders()}

Design Foundation:
- Palette: Primary {primary}, Secondary {secondary}, Accent {accent}, Background {background}
- Temperature: {temperature}, Contrast: {contrast}
- Typography: Primary font {primaryFont}, Secondary font {secondaryFont}
- Style Direction: {style}

{styleGuidelines}

Create 2-4 image generation prompts that align with the {style} aesthetic and complement this design scheme.

Each prompt should specify:
- id: unique identifier (use descriptive naming like "wine_bg_01", "decor_element_01")
- purpose: "background", "foreground", or "decoration" 
- prompt: detailed description for image generation that matches the style guidelines above
- negativePrompt: what to avoid (optional but recommended)
- guidance: creativity level 1-20 (optional, default 7.5)
- aspect: aspect ratio from ["1:1", "3:2", "4:3", "16:9", "2:3", "3:4"]

Consider the wine's characteristics, regional heritage, and target market. Create prompts for:
1. A primary background or hero image that reflects the wine's personality
2. Supporting decorative elements that enhance the brand story
3. Additional accent imagery if needed to complete the composition

Make prompts specific, detailed, and style-appropriate for best image generation results.
Always avoid: copyrighted content, text overlays, specific brand references, generic stock imagery.

Return expectedPrompts count and the prompts array with style-appropriate imagery.`;

export async function runImagePrompts(input: ImagePromptsInput): Promise<ImagePromptsOutput> {
  logger.info('Running image-prompts step', {
    paletteTemp: input.palette.temperature,
    style: input.style,
  });

  // Get style-specific guidelines for image generation
  const styleGuidelines = getImagePromptGuidelines(input.style);

  return await invokeStructuredLLM(
    'image-prompts',
    IMAGE_PROMPTS_PROMPT,
    {
      // Wine submission data - use actual data from input
      producerName: input.submission.producerName,
      wineName: input.submission.wineName,
      vintage: input.submission.vintage,
      variety: input.submission.variety,
      region: input.submission.region,
      appellation: input.submission.appellation,
      // Style and design data
      style: input.style,
      styleGuidelines,
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
