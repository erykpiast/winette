import type { LabelDSL, LabelGenerationJob, LabelStyleId } from '../types/label-generation.js';
import { LabelDSLSchema } from '../types/label-generation.js';

// 1x1 transparent PNG as data URI for placeholder images
const PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Type-safe style configurations
interface StyleConfig {
  canvas: {
    width: number;
    height: number;
    dpi: number;
    background: string;
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    temperature: 'warm' | 'cool' | 'neutral';
    contrast: 'high' | 'medium' | 'low';
  };
  typography: {
    primary: {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      letterSpacing: number;
    };
    secondary: {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      letterSpacing: number;
    };
    hierarchy: {
      producerEmphasis: 'dominant' | 'balanced' | 'subtle';
      vintageProminence: 'featured' | 'standard' | 'minimal';
      regionDisplay: 'prominent' | 'integrated' | 'subtle';
    };
  };
  fonts?: {
    primaryUrl?: string;
    secondaryUrl?: string;
  };
}

const styleConfigs: Record<LabelStyleId, StyleConfig> = {
  classic: {
    canvas: {
      width: 800,
      height: 1200,
      dpi: 300,
      background: '#FFF8DC',
    },
    palette: {
      primary: '#8B0000',
      secondary: '#DAA520',
      accent: '#FFD700',
      background: '#FFF8DC',
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Trajan Pro',
        weight: 700,
        style: 'normal',
        letterSpacing: 2,
      },
      secondary: {
        family: 'Times New Roman',
        weight: 400,
        style: 'italic',
        letterSpacing: 1,
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'prominent',
      },
    },
    fonts: {
      primaryUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
      secondaryUrl: 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;1,400&display=swap',
    },
  },
  modern: {
    canvas: {
      width: 800,
      height: 1200,
      dpi: 300,
      background: '#FFFFFF',
    },
    palette: {
      primary: '#2C3E50',
      secondary: '#E74C3C',
      accent: '#F39C12',
      background: '#FFFFFF',
      temperature: 'cool',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Helvetica Neue',
        weight: 300,
        style: 'normal',
        letterSpacing: 0,
      },
      secondary: {
        family: 'Helvetica Neue',
        weight: 700,
        style: 'normal',
        letterSpacing: 1,
      },
      hierarchy: {
        producerEmphasis: 'balanced',
        vintageProminence: 'minimal',
        regionDisplay: 'integrated',
      },
    },
  },
  elegant: {
    canvas: {
      width: 800,
      height: 1200,
      dpi: 300,
      background: '#F5F5F0',
    },
    palette: {
      primary: '#4A4A4A',
      secondary: '#D4AF37',
      accent: '#800080',
      background: '#F5F5F0',
      temperature: 'neutral',
      contrast: 'medium',
    },
    typography: {
      primary: {
        family: 'Didot',
        weight: 400,
        style: 'normal',
        letterSpacing: 1.5,
      },
      secondary: {
        family: 'Didot',
        weight: 300,
        style: 'italic',
        letterSpacing: 0.5,
      },
      hierarchy: {
        producerEmphasis: 'subtle',
        vintageProminence: 'standard',
        regionDisplay: 'subtle',
      },
    },
    fonts: {
      primaryUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
      secondaryUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,300&display=swap',
    },
  },
  funky: {
    canvas: {
      width: 800,
      height: 1200,
      dpi: 300,
      background: '#6A4C93',
    },
    palette: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: '#FFE66D',
      background: '#6A4C93',
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Futura',
        weight: 800,
        style: 'normal',
        letterSpacing: 3,
      },
      secondary: {
        family: 'Comic Sans MS',
        weight: 400,
        style: 'normal',
        letterSpacing: 0,
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'integrated',
      },
    },
  },
};

// Helper to create text elements
function createTextElement(
  id: string,
  text: string,
  font: 'primary' | 'secondary',
  color: 'primary' | 'secondary' | 'accent' | 'background',
  bounds: { x: number; y: number; w: number; h: number },
  fontSize: number,
  z: number,
  options: {
    align?: 'left' | 'center' | 'right';
    lineHeight?: number;
    maxLines?: number;
    textTransform?: 'uppercase' | 'lowercase' | 'none';
  } = {},
): LabelDSL['elements'][0] {
  return {
    id,
    type: 'text',
    text,
    font,
    color,
    bounds,
    fontSize,
    z,
    align: options.align || 'center',
    lineHeight: options.lineHeight || 1.2,
    maxLines: options.maxLines || 1,
    textTransform: options.textTransform || 'none',
  };
}

// Helper to create shape elements
function createShapeElement(
  id: string,
  shape: 'rect' | 'line',
  color: 'primary' | 'secondary' | 'accent' | 'background',
  bounds: { x: number; y: number; w: number; h: number },
  z: number,
  strokeWidth: number = 0,
  rotation: number = 0,
): LabelDSL['elements'][0] {
  return {
    id,
    type: 'shape',
    shape,
    color,
    bounds,
    z,
    strokeWidth,
    rotation,
  };
}

// Layout generators for each style
const layoutGenerators: Record<LabelStyleId, (wineData: LabelGenerationJob['wineData']) => LabelDSL['elements']> = {
  classic: (wineData) => [
    createTextElement(
      'producer',
      wineData.producerName,
      'primary',
      'primary',
      { x: 0.1, y: 0.3, w: 0.8, h: 0.1 },
      48,
      10,
      { textTransform: 'uppercase', maxLines: 2 },
    ),
    createTextElement(
      'wine-name',
      wineData.wineName,
      'secondary',
      'secondary',
      { x: 0.1, y: 0.42, w: 0.8, h: 0.08 },
      32,
      10,
    ),
    createShapeElement('separator', 'line', 'accent', { x: 0.3, y: 0.52, w: 0.4, h: 0.002 }, 5, 2),
    createTextElement(
      'region',
      `${wineData.appellation}, ${wineData.region}`,
      'secondary',
      'primary',
      { x: 0.1, y: 0.55, w: 0.8, h: 0.05 },
      24,
      10,
    ),
    createTextElement('vintage', wineData.vintage, 'primary', 'primary', { x: 0.35, y: 0.65, w: 0.3, h: 0.08 }, 64, 10),
    createTextElement(
      'variety',
      wineData.variety,
      'secondary',
      'secondary',
      { x: 0.1, y: 0.8, w: 0.8, h: 0.04 },
      20,
      10,
      { textTransform: 'uppercase' },
    ),
  ],

  modern: (wineData) => {
    const nameParts = wineData.producerName.split(' ');
    const firstName = nameParts[0] || wineData.producerName;
    const restName = nameParts.slice(1).join(' ');

    return [
      createShapeElement('color-block', 'rect', 'accent', { x: 0, y: 0, w: 0.4, h: 1 }, 1),
      createTextElement('producer', firstName, 'secondary', 'primary', { x: 0.5, y: 0.2, w: 0.4, h: 0.15 }, 72, 10, {
        align: 'left',
        textTransform: 'uppercase',
        lineHeight: 0.9,
        maxLines: 2,
      }),
      ...(restName
        ? [
            createTextElement(
              'producer-cont',
              restName,
              'primary',
              'primary',
              { x: 0.5, y: 0.35, w: 0.4, h: 0.05 },
              36,
              10,
              { align: 'left', textTransform: 'uppercase' },
            ),
          ]
        : []),
      createShapeElement('divider', 'line', 'secondary', { x: 0.5, y: 0.45, w: 0.3, h: 0.003 }, 5, 3),
      createTextElement(
        'wine-name',
        wineData.wineName,
        'primary',
        'primary',
        { x: 0.5, y: 0.5, w: 0.4, h: 0.1 },
        28,
        10,
        { align: 'left', lineHeight: 1.3, maxLines: 2 },
      ),
      createTextElement(
        'variety',
        wineData.variety,
        'secondary',
        'secondary',
        { x: 0.5, y: 0.65, w: 0.4, h: 0.05 },
        24,
        10,
        { align: 'left', textTransform: 'uppercase' },
      ),
      createTextElement('region', wineData.region, 'primary', 'primary', { x: 0.5, y: 0.85, w: 0.4, h: 0.04 }, 18, 10, {
        align: 'left',
        textTransform: 'uppercase',
      }),
      createTextElement(
        'vintage',
        wineData.vintage,
        'primary',
        'primary',
        { x: 0.5, y: 0.9, w: 0.4, h: 0.04 },
        20,
        10,
        { align: 'left' },
      ),
    ];
  },

  elegant: (wineData) => [
    createTextElement(
      'producer',
      wineData.producerName,
      'primary',
      'primary',
      { x: 0.1, y: 0.25, w: 0.8, h: 0.08 },
      32,
      10,
      { lineHeight: 1.4 },
    ),
    createTextElement(
      'wine-name',
      wineData.wineName,
      'secondary',
      'secondary',
      { x: 0.1, y: 0.4, w: 0.8, h: 0.12 },
      42,
      10,
      { lineHeight: 1.3, maxLines: 2 },
    ),
    createShapeElement('separator', 'line', 'accent', { x: 0.35, y: 0.55, w: 0.3, h: 0.001 }, 5, 1),
    createTextElement('vintage', wineData.vintage, 'primary', 'primary', { x: 0.3, y: 0.6, w: 0.4, h: 0.1 }, 56, 10),
    createTextElement(
      'variety',
      wineData.variety,
      'secondary',
      'primary',
      { x: 0.2, y: 0.75, w: 0.6, h: 0.05 },
      22,
      10,
      { lineHeight: 1.3 },
    ),
    createTextElement(
      'region',
      wineData.appellation,
      'primary',
      'primary',
      { x: 0.2, y: 0.85, w: 0.6, h: 0.04 },
      18,
      10,
      { textTransform: 'uppercase' },
    ),
    createShapeElement('bottom-accent', 'rect', 'accent', { x: 0.45, y: 0.92, w: 0.1, h: 0.002 }, 5),
  ],

  funky: (wineData) => [
    createShapeElement('accent-shape', 'rect', 'accent', { x: 0.1, y: 0.32, w: 0.8, h: 0.08 }, 15, 0, -5),
    createTextElement(
      'producer',
      wineData.producerName,
      'primary',
      'primary',
      { x: 0.05, y: 0.1, w: 0.9, h: 0.2 },
      64,
      20,
      { textTransform: 'uppercase', lineHeight: 0.9, maxLines: 2 },
    ),
    createTextElement(
      'wine-name',
      wineData.wineName,
      'secondary',
      'background',
      { x: 0.1, y: 0.33, w: 0.8, h: 0.06 },
      36,
      25,
      { lineHeight: 1 },
    ),
    createTextElement(
      'vintage',
      wineData.vintage,
      'primary',
      'secondary',
      { x: 0.2, y: 0.45, w: 0.6, h: 0.15 },
      120,
      20,
      { lineHeight: 1 },
    ),
    createTextElement('variety', wineData.variety, 'primary', 'primary', { x: 0.1, y: 0.65, w: 0.8, h: 0.08 }, 40, 20, {
      textTransform: 'uppercase',
      lineHeight: 1.1,
    }),
    createShapeElement('fun-line-1', 'line', 'accent', { x: 0.1, y: 0.75, w: 0.3, h: 0.01 }, 10, 8, 10),
    createShapeElement('fun-line-2', 'line', 'secondary', { x: 0.6, y: 0.77, w: 0.3, h: 0.01 }, 10, 8, -10),
    createTextElement(
      'region',
      `${wineData.region} • ${wineData.appellation}`,
      'secondary',
      'primary',
      { x: 0.1, y: 0.85, w: 0.8, h: 0.05 },
      24,
      20,
    ),
  ],
};

/**
 * Generate mock Label DSL data for testing
 * @param style - The label style to generate
 * @param wineData - The wine data to include in the label
 * @returns A validated Label DSL object
 * @throws If the generated data doesn't match the schema
 */
export function generateMockLabelDSL(style: LabelStyleId, wineData: LabelGenerationJob['wineData']): LabelDSL {
  const config = styleConfigs[style];
  const elements = layoutGenerators[style](wineData);

  // Create assets only if needed (classic and elegant styles)
  const assets: LabelDSL['assets'] = [];
  if (style === 'classic' || style === 'elegant') {
    assets.push({
      id: 'placeholder-image',
      type: 'image',
      url: PLACEHOLDER_IMAGE,
      width: 800,
      height: 600,
    });
  }

  const mockDSL: LabelDSL = {
    version: '1',
    canvas: config.canvas,
    palette: config.palette,
    typography: config.typography,
    fonts: config.fonts,
    assets,
    elements,
  };

  // Validate the generated mock against the schema
  const result = LabelDSLSchema.safeParse(mockDSL);
  if (!result.success) {
    throw new Error(`Generated mock DSL for style '${style}' is invalid: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Generate mock Label DSL with custom overrides for testing
 * @param style - The base style to use
 * @param wineData - The wine data to include
 * @param overrides - Partial DSL to override specific values
 * @returns A validated Label DSL object
 */
export function generateMockLabelDSLWithOverrides(
  style: LabelStyleId,
  wineData: LabelGenerationJob['wineData'],
  overrides: Partial<LabelDSL>,
): LabelDSL {
  const baseMock = generateMockLabelDSL(style, wineData);
  const mergedMock = { ...baseMock, ...overrides };

  // Validate the merged result
  const result = LabelDSLSchema.safeParse(mergedMock);
  if (!result.success) {
    throw new Error(`Mock DSL with overrides for style '${style}' is invalid: ${result.error.message}`);
  }

  return result.data;
}
