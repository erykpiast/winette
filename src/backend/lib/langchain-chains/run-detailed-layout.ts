import {
  type DetailedLayoutInput,
  DetailedLayoutInputSchema,
  type DetailedLayoutOutput,
  DetailedLayoutOutputSchema,
} from '#backend/schema/langchain-pipeline-schemas.js';
import { generateAssetDescriptions } from '../asset-utils.js';
import { invokeStructuredLLM } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';
import { COMMON_SECTIONS, STYLE_GUIDELINES } from './prompt-constants.js';

const DETAILED_LAYOUT_PROMPT = `You are a wine label layout designer creating a unique composition that reflects this wine's character and brand positioning.

Wine Information:
- Producer: {producerName}
- Wine Name: {wineName}
- Vintage: {vintage}
- Variety: {variety}
- Region: {region}
- Appellation: {appellation}

Design Foundation:
- Canvas: {width}x{height} pixels, DPI {dpi}, Background: {background}
- Palette: Primary {primary}, Secondary {secondary}, Accent {accent}, Temperature {temperature}, Contrast {contrast}
- Assets available: {assetCount} images
- Style Direction: {style}

Asset Details:
{assetDetails}

Typography System:
- Primary: {primaryFont} {primaryWeight} {primaryStyle}
- Secondary: {secondaryFont} {secondaryWeight} {secondaryStyle}
- Hierarchy: Producer emphasis {producerEmphasis}, Vintage prominence {vintageProminence}, Region display {regionDisplay}

LAYOUT DESIGN STRATEGY:

Consider the wine's personality and create a layout that tells its story:
1. WINE CHARACTER INFLUENCE: Let the wine variety and region guide your layout approach
   - Bold varieties (Cabernet, Syrah): Strong, centered compositions with prominent text placement
   - Elegant varieties (Pinot Noir, Chardonnay): Refined, balanced layouts with sophisticated spacing
   - Fresh varieties (Sauvignon Blanc, Riesling): Clean, airy compositions with dynamic positioning
   - Traditional regions (Bordeaux, Tuscany): Classic, symmetrical layouts respecting heritage
   - New World regions: More experimental, asymmetrical approaches

2. TYPOGRAPHY HIERARCHY: Use the hierarchy settings to determine prominence
   - Producer emphasis "dominant": Large, central producer name, smaller wine name
   - Producer emphasis "balanced": Equal visual weight between producer and wine name
   - Producer emphasis "subtle": Wine name dominates, producer name supporting role
   - Vintage prominence "featured": Vintage as key design element, larger size, prominent position
   - Vintage prominence "standard": Normal vintage treatment, integrated with other text
   - Vintage prominence "minimal": Small, discrete vintage placement
   - Region display "prominent": Region name as major element, featured positioning
   - Region display "integrated": Region naturally woven into overall composition
   - Region display "subtle": Region as small, supporting element

3. IMAGE INTEGRATION: Create unique compositions with the available assets
   - Background images: Can be full-bleed, partial coverage, or geometric shapes
   - Foreground images: Key focal points, artistic elements, brand symbols
   - Decoration images: Accents, borders, ornamental details, pattern elements
   - Consider rotation, opacity, and cropping for artistic effect
   - Avoid cookie-cutter placement - each wine deserves a unique approach

4. VISUAL FLOW: Guide the eye naturally through the information hierarchy
   - Create clear reading paths based on importance
   - Use white space strategically for breathing room
   - Balance text and image elements for harmony
   - Consider the wine's target market sophistication level

5. STYLE-SPECIFIC LAYOUT APPROACHES:
   - CLASSIC style: ${STYLE_GUIDELINES.classic.layout} Images: ${STYLE_GUIDELINES.classic.imagery}
   
   - MODERN style: ${STYLE_GUIDELINES.modern.layout} Images: ${STYLE_GUIDELINES.modern.imagery}
   
   - ELEGANT style: ${STYLE_GUIDELINES.elegant.layout} Images: ${STYLE_GUIDELINES.elegant.imagery}
   
   - FUNKY style: ${STYLE_GUIDELINES.funky.layout} Images: ${STYLE_GUIDELINES.funky.imagery}

Create a complete LabelDSL with UNIQUE element positioning:
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
    // COPY EXACTLY: Use the exact JSON objects listed in Asset Details above
    // DO NOT modify any fields - copy id, type, url, width, height exactly as shown
  ],
  "elements": [
    // CREATE UNIQUE LAYOUTS - DO NOT USE TEMPLATE POSITIONS
    // Include ALL required text elements: producer, wine name, vintage, variety, region, appellation
    // Position each element thoughtfully based on hierarchy and wine character
    // Use ALL {assetCount} images creatively - no unused assets allowed
    // Example structure (adapt positioning for THIS specific wine):
    {{
      "id": "producer_text",
      "type": "text", 
      "text": "{producerName}",
      "bounds": {{ "x": 0.1, "y": 0.05, "w": 0.8, "h": 0.1 }},
      "z": 100,
      "font": "primary",
      "color": "primary",
      "align": "center",
      "fontSize": 36,
      "lineHeight": 1.2,
      "maxLines": 2,
      "textTransform": "uppercase"
    }}
    // Continue with wine_name, vintage, variety, region, appellation text elements
    // Add ALL image elements using actual asset IDs
    // Add decorative shape elements if they enhance the design
  ]
}}

${COMMON_SECTIONS.enumValidation}

CRITICAL REQUIREMENTS:
- Apply the {style} style approach from section 5 above
- Position elements using relative coordinates (0-1 range for x, y, w, h)
- Create exactly {assetCount} image elements using the asset IDs from Asset Details above
- Include ALL wine information as text elements (producer, wine name, vintage, variety, region, appellation)
- Every asset must be referenced exactly once - no unused assets allowed
- Use z-index values 0-1000 for proper layering
- ONLY use the exact enum values listed above - no variations or alternatives allowed
- Make each layout unique to reflect THIS wine's character and positioning`;

export async function runDetailedLayout(input: DetailedLayoutInput): Promise<DetailedLayoutOutput> {
  logger.info('Running detailed-layout step', {
    canvasSize: `${input.canvas.width}x${input.canvas.height}`,
    assetCount: input.assets.length,
  });

  // Generate asset details using centralized utility for consistency
  const assetDetails = generateAssetDescriptions(input.assets);

  return await invokeStructuredLLM(
    'detailed-layout',
    DETAILED_LAYOUT_PROMPT,
    {
      // Wine submission data
      producerName: input.submission.producerName,
      wineName: input.submission.wineName,
      vintage: input.submission.vintage,
      variety: input.submission.variety,
      region: input.submission.region,
      appellation: input.submission.appellation,
      // Design data
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
      style: input.style,
    },
    DetailedLayoutOutputSchema,
    DetailedLayoutInputSchema,
    input,
  );
}
