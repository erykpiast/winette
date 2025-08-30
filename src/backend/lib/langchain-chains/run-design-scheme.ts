import {
  type DesignSchemeInput,
  DesignSchemeInputSchema,
  type DesignSchemeOutput,
  DesignSchemeOutputSchema,
} from '#backend/schema/langchain-pipeline-schemas.js';
import { invokeStructuredLLM } from '../langchain-pipeline/index.js';
import { logger } from '../logger.js';
import { STYLE_GUIDELINES } from './prompt-constants.js';

const DESIGN_SCHEME_PROMPT = `You are a professional wine label designer creating a design scheme for a wine label.

Wine Details:
- Producer: {producerName}
- Wine Name: {wineName} 
- Vintage: {vintage}
- Variety: {variety}
- Region: {region}
- Appellation: {appellation}

Style Direction: {style}

Based on this wine's characteristics, create a unique design scheme that reflects:
1. The wine variety's personality (e.g., bold Cabernet, elegant Pinot Noir, crisp Sauvignon Blanc)
2. The regional terroir and cultural heritage
3. The producer's brand positioning
4. The target market and price point

Canvas Sizing Guidelines:
- Standard wine labels: 750-900px wide, 1000-1200px tall
- Premium wines: 800-1000px wide, 1200-1500px tall
- Boutique/artisan: 700-800px wide, 900-1100px tall
- Choose DPI between 144-300 based on print quality needs

Color Palette Principles:
- Reflect wine variety characteristics (rich reds for Cabernet, golden tones for Chardonnay, etc.)
- Consider regional associations (Burgundy earth tones, Champagne elegance, etc.)
- Match the style direction and target demographic
- Ensure proper contrast for text readability

Typography Strategy:
- Primary font should embody the producer's personality
- Secondary font should complement and provide hierarchy
- Consider wine style: traditional varieties favor classic fonts, modern wines allow contemporary choices
- Set hierarchy emphasis based on producer reputation and marketing strategy

Style Direction Guidelines:
- classic: ${STYLE_GUIDELINES.classic.description}. ${STYLE_GUIDELINES.classic.characteristics}
- modern: ${STYLE_GUIDELINES.modern.description}. ${STYLE_GUIDELINES.modern.characteristics}
- elegant: ${STYLE_GUIDELINES.elegant.description}. ${STYLE_GUIDELINES.elegant.characteristics}
- funky: ${STYLE_GUIDELINES.funky.description}. ${STYLE_GUIDELINES.funky.characteristics}

Create a comprehensive design scheme following this EXACT JSON structure:
{{
  "version": "1",
  "canvas": {{
    "width": [choose appropriate width],
    "height": [choose appropriate height], 
    "dpi": [choose appropriate dpi],
    "background": "[hex color that supports overall design]"
  }},
  "palette": {{
    "primary": "[hex color reflecting wine character]",
    "secondary": "[hex color complementing primary]", 
    "accent": "[hex color for highlights and emphasis]",
    "background": "[hex color matching canvas background]",
    "temperature": "[warm/cool/neutral based on wine style]",
    "contrast": "[high/medium/low based on readability needs]"
  }},
  "typography": {{
    "primary": {{
      "family": "[font family appropriate for wine character]",
      "weight": [100-900 based on emphasis needs],
      "style": "[normal/italic]",
      "letterSpacing": [spacing in em units]
    }},
    "secondary": {{
      "family": "[complementary font family]",
      "weight": [100-900],
      "style": "[normal/italic]", 
      "letterSpacing": [spacing in em units]
    }},
    "hierarchy": {{
      "producerEmphasis": "[dominant/balanced/subtle based on brand strategy]",
      "vintageProminence": "[featured/standard/minimal based on wine positioning]",
      "regionDisplay": "[prominent/integrated/subtle based on regional importance]"
    }}
  }},
  "assets": []
}}

IMPORTANT: All color values MUST be valid hex strings (e.g., "#FF0000"). Choose colors that authentically represent this specific wine and producer, not generic examples.`;

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
