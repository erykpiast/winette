// Shared constants and utilities for LangChain prompt engineering
// This centralizes common patterns and reduces duplication across chain prompts

// ============================================================================
// Enum Validation Instructions
// ============================================================================

export const ENUM_VALIDATION_INSTRUCTIONS = {
  font: '"primary" OR "secondary" (no other values allowed)',
  color: '"primary" OR "secondary" OR "accent" OR "background" (no other values allowed)',
  align: '"left" OR "center" OR "right" (no other values allowed)',
  textTransform: '"uppercase" OR "lowercase" OR "none" (no other values allowed)',
  fit: '"contain" OR "cover" OR "fill" (no other values allowed)',
  shape: '"rect" OR "line" (no other values allowed)',
} as const;

export function formatEnumInstructions(): string {
  return Object.entries(ENUM_VALIDATION_INSTRUCTIONS)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}

// ============================================================================
// Style-Specific Guidelines
// ============================================================================

export const STYLE_GUIDELINES = {
  classic: {
    description: 'Traditional wine regions, established producers, time-honored varieties',
    characteristics: 'refined serif fonts, sophisticated color palettes, balanced proportions',
    layout:
      'Symmetrical, centered compositions with traditional text positioning. Producer name at top center, wine name prominently below, vintage and region in balanced lower sections.',
    imagery:
      'Traditional vineyard scenes, estate imagery, vintage illustrations, heraldic elements, classic wine country landscapes',
    colors: 'Earth tones, deep burgundies, forest greens, golden accents, cream backgrounds',
  },
  modern: {
    description: 'Contemporary wineries, innovative techniques, younger demographics',
    characteristics: 'clean sans-serif fonts, bold color contrasts, asymmetrical layouts',
    layout:
      'Asymmetrical, dynamic layouts with bold text placement. Experiment with off-center positioning, varied text sizes, strong geometric image cropping.',
    imagery:
      'Abstract patterns, geometric shapes, minimalist photography, bold graphic elements, contemporary architectural elements',
    colors: 'High contrast combinations, pure whites, deep blacks, vibrant accent colors',
  },
  elegant: {
    description: 'Premium positioning, luxury market, sophisticated consumers',
    characteristics: 'script or refined serif fonts, rich color palettes, refined hierarchy',
    layout:
      'Sophisticated, refined compositions with generous white space. Graceful text positioning, luxurious spacing, subtle image integration.',
    imagery:
      'Luxury textures, refined photography, subtle watercolors, sophisticated patterns, premium materials, artistic abstracts',
    colors: 'Rich jewel tones, metallic accents, deep wines, champagne golds, ivory whites',
  },
  funky: {
    description: 'Natural wines, creative producers, adventurous consumers',
    characteristics: 'unique font combinations, vibrant colors, experimental approaches',
    layout:
      'Creative, experimental layouts with unconventional positioning. Playful text angles, vibrant image treatments, unexpected element placement.',
    imagery:
      'Vibrant illustrations, playful patterns, artistic collages, unconventional imagery, hand-drawn elements, mixed media textures',
    colors: 'Bright, unexpected combinations, neon accents, rainbow spectrums, bold contrasts',
  },
} as const;

export function getStyleGuidelines(
  style: keyof typeof STYLE_GUIDELINES,
): (typeof STYLE_GUIDELINES)[keyof typeof STYLE_GUIDELINES] {
  return STYLE_GUIDELINES[style];
}

// ============================================================================
// Wine Information Formatting
// ============================================================================

export function formatWineDetailsPlaceholders(): string {
  return `Wine Details:
- Producer: {producerName}
- Wine Name: {wineName}
- Vintage: {vintage}
- Variety: {variety}
- Region: {region}
- Appellation: {appellation}`;
}

// ============================================================================
// Common Prompt Sections
// ============================================================================

export const COMMON_SECTIONS = {
  styleIntro: (step: string) => `You are a professional wine label ${step} specialist.

${formatWineDetailsPlaceholders()}

Style Direction: {style}`,

  styleSpecificGuidelines: `Apply style-specific approaches:
- CLASSIC: ${STYLE_GUIDELINES.classic.characteristics}
- MODERN: ${STYLE_GUIDELINES.modern.characteristics}
- ELEGANT: ${STYLE_GUIDELINES.elegant.characteristics}
- FUNKY: ${STYLE_GUIDELINES.funky.characteristics}`,

  enumValidation: `VALID ENUM VALUES (MUST USE EXACTLY):
${formatEnumInstructions()}`,

  criticalRequirements: `CRITICAL REQUIREMENTS:
- Position elements using relative coordinates (0-1 range for x, y, w, h)
- Use z-index values 0-1000 for proper layering
- ONLY use the exact enum values listed above - no variations or alternatives allowed
- All color values MUST be valid hex strings (e.g., "#FF0000")`,
} as const;

// ============================================================================
// Style-Specific Image Prompting Guidelines
// ============================================================================

export function getImagePromptGuidelines(style: keyof typeof STYLE_GUIDELINES): string {
  const guidelines = STYLE_GUIDELINES[style];
  return `STYLE-SPECIFIC IMAGE GUIDELINES for ${style.toUpperCase()}:
- Theme: ${guidelines.description}
- Visual Style: ${guidelines.imagery}
- Color Palette: ${guidelines.colors}
- Aesthetic: ${guidelines.characteristics}`;
}
