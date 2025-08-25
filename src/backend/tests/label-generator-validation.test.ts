import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateLabelDSL } from '../services/label-generator.js';
import type { LabelDSL, LabelGenerationJob } from '../types/label-generation.js';
import { LabelDSLSchema } from '../types/label-generation.js';

// Mock the logger
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the mock-data-generator module
vi.mock('../services/mock-data-generator.js', () => ({
  generateMockLabelDSL: vi.fn(),
}));

// Import the mocked function
import { generateMockLabelDSL } from '../services/mock-data-generator.js';

describe('generateLabelDSL validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const testJob: LabelGenerationJob = {
    submissionId: 'test-submission-id',
    style: 'classic',
    wineData: {
      producerName: 'Test Winery',
      wineName: 'Test Wine',
      vintage: '2021',
      variety: 'Cabernet Sauvignon',
      region: 'Napa Valley',
      appellation: 'Oakville AVA',
    },
  };

  it('should return valid DSL when mock generator produces valid data', async () => {
    const validMockDSL = {
      version: '1' as const,
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: '#FFFFFF',
      },
      palette: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FF0000',
        background: '#FFFFFF',
        temperature: 'neutral' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: {
          family: 'Arial',
          weight: 700,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'Arial',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'prominent' as const,
        },
      },
      assets: [],
      elements: [],
    };

    vi.mocked(generateMockLabelDSL).mockReturnValue(validMockDSL);

    const result = await generateLabelDSL(testJob);

    expect(result).toEqual(validMockDSL);
    expect(generateMockLabelDSL).toHaveBeenCalledWith('classic', testJob.wineData);
  });

  it('should throw error when mock generator produces invalid data', async () => {
    const invalidMockDSL = {
      version: '2', // Invalid version
      canvas: {
        width: -100, // Invalid negative width
        height: 1200,
        dpi: 300,
        background: '#FFFFFF',
      },
      palette: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FF0000',
        background: '#FFFFFF',
        temperature: 'hot' as unknown as 'warm' | 'cool' | 'neutral', // Invalid temperature
        contrast: 'high',
      },
      typography: {
        primary: {
          family: 'Arial',
          weight: 700,
          style: 'normal',
          letterSpacing: 0,
        },
        secondary: {
          family: 'Arial',
          weight: 400,
          style: 'normal',
          letterSpacing: 0,
        },
        hierarchy: {
          producerEmphasis: 'dominant',
          vintageProminence: 'featured',
          regionDisplay: 'prominent',
        },
      },
      assets: [],
      elements: [],
    };

    vi.mocked(generateMockLabelDSL).mockReturnValue(invalidMockDSL as unknown as LabelDSL);

    await expect(generateLabelDSL(testJob)).rejects.toThrow('Generated DSL failed validation');
  });

  it('should validate all required fields are present', async () => {
    const incompleteMockDSL = {
      version: '1' as const,
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: '#FFFFFF',
      },
      // Missing palette
      typography: {
        primary: {
          family: 'Arial',
          weight: 700,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'Arial',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'prominent' as const,
        },
      },
      assets: [],
      elements: [],
    };

    vi.mocked(generateMockLabelDSL).mockReturnValue(incompleteMockDSL as unknown as LabelDSL);

    await expect(generateLabelDSL(testJob)).rejects.toThrow('Generated DSL failed validation');
  });

  it('should validate element cross-references', async () => {
    const mockDSLWithInvalidRef = {
      version: '1' as const,
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: '#FFFFFF',
      },
      palette: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FF0000',
        background: '#FFFFFF',
        temperature: 'neutral' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: {
          family: 'Arial',
          weight: 700,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'Arial',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'prominent' as const,
        },
      },
      assets: [],
      elements: [
        {
          id: 'image-1',
          type: 'image' as const,
          assetId: 'non-existent-asset', // This asset doesn't exist
          bounds: { x: 0, y: 0, w: 1, h: 1 },
          fit: 'contain' as const,
          opacity: 1,
          rotation: 0,
          z: 1,
        },
      ],
    };

    vi.mocked(generateMockLabelDSL).mockReturnValue(mockDSLWithInvalidRef);

    await expect(generateLabelDSL(testJob)).rejects.toThrow('Generated DSL failed validation');
  });

  it('should handle test variety modes before validation', async () => {
    const errorJob = {
      ...testJob,
      wineData: {
        ...testJob.wineData,
        variety: 'TEST_ERROR',
      },
    };

    await expect(generateLabelDSL(errorJob)).rejects.toThrow('Simulated processing error');
    expect(generateMockLabelDSL).not.toHaveBeenCalled();
  });

  it('should pass through validated data unchanged', async () => {
    const validMockDSL = {
      version: '1' as const,
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: '#FFFFFF',
      },
      palette: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FF0000',
        background: '#FFFFFF',
        temperature: 'neutral' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: {
          family: 'Arial',
          weight: 700,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        secondary: {
          family: 'Arial',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 0,
        },
        hierarchy: {
          producerEmphasis: 'dominant' as const,
          vintageProminence: 'featured' as const,
          regionDisplay: 'prominent' as const,
        },
      },
      assets: [
        {
          id: 'test-asset',
          type: 'image' as const,
          url: 'data:image/png;base64,test',
          width: 100,
          height: 100,
        },
      ],
      elements: [
        {
          id: 'test-text',
          type: 'text' as const,
          text: 'Test',
          font: 'primary' as const,
          color: 'primary' as const,
          bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
          fontSize: 24,
          align: 'center' as const,
          lineHeight: 1.2,
          maxLines: 1,
          textTransform: 'none' as const,
          z: 10,
        },
      ],
    };

    vi.mocked(generateMockLabelDSL).mockReturnValue(validMockDSL);

    const result = await generateLabelDSL(testJob);

    // The result should be the validated data (which might be a new object)
    expect(result).toEqual(validMockDSL);

    // Validate the result independently
    const validation = LabelDSLSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });
});
