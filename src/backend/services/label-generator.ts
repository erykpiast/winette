import type { LabelDescription, LabelGenerationJob, LabelStyleId } from '../types/label-generation.js';

export async function generateLabelDescription(
  job: LabelGenerationJob,
  attemptCount: number = 1,
): Promise<LabelDescription> {
  const { style, wineData } = job;

  // Test modes for pipeline validation
  if (wineData.variety === 'TEST_ERROR') {
    throw new Error('Simulated processing error');
  }
  if (wineData.variety === 'TEST_TIMEOUT') {
    await new Promise((r) => setTimeout(r, 35000)); // Exceed 30s timeout
  }
  if (wineData.variety === 'TEST_RETRY') {
    if (attemptCount < 3) {
      throw new Error(`Retry test: attempt ${attemptCount}`);
    }
  }

  // Return mock data for the selected style
  return getMockLabelDescription(style);
}

// Mock data generator - returns consistent test data
function getMockLabelDescription(style: LabelStyleId): LabelDescription {
  const mockDescriptions = {
    classic: createClassicMockDescription(),
    modern: createModernMockDescription(),
    elegant: createElegantMockDescription(),
    funky: createFunkyMockDescription(),
  };

  return mockDescriptions[style];
}

function createClassicMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#8B0000', rgb: [139, 0, 0], name: 'Dark Red' },
      secondary: { hex: '#DAA520', rgb: [218, 165, 32], name: 'Goldenrod' },
      accent: { hex: '#FFD700', rgb: [255, 215, 0], name: 'Gold' },
      background: { hex: '#FFF8DC', rgb: [255, 248, 220], name: 'Cornsilk' },
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Trajan Pro',
        weight: 700,
        style: 'normal',
        letterSpacing: 2,
        characteristics: ['serif', 'traditional', 'carved'],
      },
      secondary: {
        family: 'Times New Roman',
        weight: 400,
        style: 'italic',
        letterSpacing: 1,
        characteristics: ['serif', 'elegant', 'readable'],
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'prominent',
      },
    },
    layout: {
      alignment: 'centered',
      composition: 'classical',
      whitespace: 'balanced',
      structure: 'rigid',
    },
    imagery: {
      primaryTheme: 'estate',
      elements: ['château silhouette', 'vine borders', 'heraldic shield'],
      style: 'engraving',
      complexity: 'detailed',
    },
    decorations: [
      {
        type: 'border',
        theme: 'vine-scroll',
        placement: 'full',
        weight: 'moderate',
      },
      {
        type: 'flourish',
        theme: 'baroque',
        placement: 'corners',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'sophisticated and traditional',
      attributes: ['luxurious', 'heritage', 'prestigious', 'time-honored'],
    },
  };
}

function createModernMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#2C3E50', rgb: [44, 62, 80], name: 'Dark Blue Gray' },
      secondary: { hex: '#E74C3C', rgb: [231, 76, 60], name: 'Red' },
      accent: { hex: '#F39C12', rgb: [243, 156, 18], name: 'Orange' },
      background: { hex: '#FFFFFF', rgb: [255, 255, 255], name: 'White' },
      temperature: 'cool',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Helvetica Neue',
        weight: 300,
        style: 'normal',
        letterSpacing: 0,
        characteristics: ['sans-serif', 'clean', 'minimal'],
      },
      secondary: {
        family: 'Helvetica Neue',
        weight: 700,
        style: 'normal',
        letterSpacing: 1,
        characteristics: ['sans-serif', 'bold', 'geometric'],
      },
      hierarchy: {
        producerEmphasis: 'balanced',
        vintageProminence: 'minimal',
        regionDisplay: 'integrated',
      },
    },
    layout: {
      alignment: 'asymmetric',
      composition: 'dynamic',
      whitespace: 'generous',
      structure: 'geometric',
    },
    imagery: {
      primaryTheme: 'abstract',
      elements: ['geometric shapes', 'color blocks', 'minimal lines'],
      style: 'minimal',
      complexity: 'simple',
    },
    decorations: [
      {
        type: 'divider',
        theme: 'geometric',
        placement: 'accent',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'fresh and contemporary',
      attributes: ['innovative', 'approachable', 'clean', 'forward-thinking'],
    },
  };
}

function createElegantMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#4A4A4A', rgb: [74, 74, 74], name: 'Charcoal Gray' },
      secondary: { hex: '#D4AF37', rgb: [212, 175, 55], name: 'Gold' },
      accent: { hex: '#800080', rgb: [128, 0, 128], name: 'Purple' },
      background: { hex: '#F5F5F0', rgb: [245, 245, 240], name: 'Cream' },
      temperature: 'neutral',
      contrast: 'medium',
    },
    typography: {
      primary: {
        family: 'Didot',
        weight: 400,
        style: 'normal',
        letterSpacing: 1.5,
        characteristics: ['serif', 'refined', 'high-contrast'],
      },
      secondary: {
        family: 'Didot',
        weight: 300,
        style: 'italic',
        letterSpacing: 0.5,
        characteristics: ['serif', 'delicate', 'sophisticated'],
      },
      hierarchy: {
        producerEmphasis: 'subtle',
        vintageProminence: 'standard',
        regionDisplay: 'subtle',
      },
    },
    layout: {
      alignment: 'centered',
      composition: 'minimal',
      whitespace: 'generous',
      structure: 'organic',
    },
    imagery: {
      primaryTheme: 'botanical',
      elements: ['delicate vine leaves', 'subtle flourishes'],
      style: 'watercolor',
      complexity: 'moderate',
    },
    decorations: [
      {
        type: 'flourish',
        theme: 'art-nouveau',
        placement: 'top-bottom',
        weight: 'delicate',
      },
    ],
    mood: {
      overall: 'refined and understated',
      attributes: ['sophisticated', 'graceful', 'timeless', 'refined'],
    },
  };
}

function createFunkyMockDescription(): LabelDescription {
  return {
    colorPalette: {
      primary: { hex: '#FF6B6B', rgb: [255, 107, 107], name: 'Coral' },
      secondary: { hex: '#4ECDC4', rgb: [78, 205, 196], name: 'Turquoise' },
      accent: { hex: '#FFE66D', rgb: [255, 230, 109], name: 'Yellow' },
      background: { hex: '#6A4C93', rgb: [106, 76, 147], name: 'Purple' },
      temperature: 'warm',
      contrast: 'high',
    },
    typography: {
      primary: {
        family: 'Futura',
        weight: 800,
        style: 'normal',
        letterSpacing: 3,
        characteristics: ['sans-serif', 'bold', 'geometric'],
      },
      secondary: {
        family: 'Comic Sans MS',
        weight: 400,
        style: 'normal',
        letterSpacing: 0,
        characteristics: ['casual', 'playful', 'rounded'],
      },
      hierarchy: {
        producerEmphasis: 'dominant',
        vintageProminence: 'featured',
        regionDisplay: 'integrated',
      },
    },
    layout: {
      alignment: 'asymmetric',
      composition: 'dynamic',
      whitespace: 'compact',
      structure: 'organic',
    },
    imagery: {
      primaryTheme: 'abstract',
      elements: ['splashes', 'organic shapes', 'paint drips'],
      style: 'art',
      complexity: 'detailed',
    },
    decorations: [
      {
        type: 'pattern',
        theme: 'organic',
        placement: 'accent',
        weight: 'bold',
      },
      {
        type: 'flourish',
        theme: 'psychedelic',
        placement: 'corners',
        weight: 'bold',
      },
    ],
    mood: {
      overall: 'vibrant and playful',
      attributes: ['energetic', 'creative', 'bold', 'unconventional'],
    },
  };
}
