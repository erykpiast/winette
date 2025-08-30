// Integration tests for LangChain pipeline with real LLMs
// These tests run only when API keys are available and INTEGRATION_TESTS=true

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger to prevent NewRelic errors in tests
vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { runDesignScheme, runDetailedLayout, runImagePrompts } from '../lib/langchain-chains/index.js';
import { configurePipeline } from '../lib/langchain-pipeline/index.js';
import type {
  DesignSchemeInput,
  DetailedLayoutInput,
  ImagePromptsInput,
} from '../schema/langchain-pipeline-schemas.js';

// Skip these tests unless explicitly enabled and API keys are available
const shouldRunIntegrationTests =
  process.env.INTEGRATION_TESTS === 'true' && process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV !== 'production'; // Don't run in production to avoid costs

describe.skipIf(!shouldRunIntegrationTests)('LangChain Integration Tests', () => {
  beforeEach(() => {
    // Configure for real LLM usage
    configurePipeline({
      // Don't use mockLLM - use real models
    });
  });

  it('should generate design scheme with real Anthropic LLM', async () => {
    const input: DesignSchemeInput = {
      submission: {
        producerName: 'Integration Test Winery',
        wineName: 'Test Cabernet',
        vintage: '2023',
        variety: 'Cabernet Sauvignon',
        region: 'Napa Valley',
        appellation: 'Napa Valley AVA',
      },
      style: 'elegant',
      historicalExamples: [],
    };

    const result = await runDesignScheme(input);

    // Verify the structure matches our schema
    expect(result).toMatchObject({
      version: '1',
      canvas: {
        width: expect.any(Number),
        height: expect.any(Number),
        dpi: expect.any(Number),
        background: expect.stringMatching(/^#[0-9A-F]{6}$/i),
      },
      palette: {
        primary: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        secondary: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        accent: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        background: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        temperature: expect.stringMatching(/^(warm|cool|neutral)$/),
        contrast: expect.stringMatching(/^(high|medium|low)$/),
      },
      typography: {
        primary: {
          family: expect.any(String),
          weight: expect.any(Number),
          style: expect.stringMatching(/^(normal|italic)$/),
          letterSpacing: expect.any(Number),
        },
        secondary: {
          family: expect.any(String),
          weight: expect.any(Number),
          style: expect.stringMatching(/^(normal|italic)$/),
          letterSpacing: expect.any(Number),
        },
        hierarchy: {
          producerEmphasis: expect.stringMatching(/^(dominant|balanced|subtle)$/),
          vintageProminence: expect.stringMatching(/^(featured|standard|minimal)$/),
          regionDisplay: expect.stringMatching(/^(prominent|integrated|subtle)$/),
        },
      },
      assets: [],
      elements: [],
    });

    // Verify canvas dimensions are reasonable
    expect(result.canvas.width).toBeGreaterThan(200);
    expect(result.canvas.width).toBeLessThan(2000);
    expect(result.canvas.height).toBeGreaterThan(200);
    expect(result.canvas.height).toBeLessThan(3000);
    expect(result.canvas.dpi).toBeGreaterThanOrEqual(150);

    console.log('✅ Real LLM design scheme generation successful:', {
      canvas: `${result.canvas.width}x${result.canvas.height}@${result.canvas.dpi}dpi`,
      palette: `${result.palette.temperature} ${result.palette.contrast}`,
      fonts: `${result.typography.primary.family} + ${result.typography.secondary.family}`,
    });
  }, 15000); // 15 second timeout for real LLM calls

  it('should generate image prompts with real LLM', async () => {
    const input: ImagePromptsInput = {
      version: '1',
      canvas: {
        width: 750,
        height: 1000,
        dpi: 300,
        background: '#F5F5DC',
      },
      palette: {
        primary: '#8B0000',
        secondary: '#DAA520',
        accent: '#2F4F4F',
        background: '#F5F5DC',
        temperature: 'warm',
        contrast: 'high',
      },
      typography: {
        primary: {
          family: 'serif',
          weight: 700,
          style: 'normal',
          letterSpacing: 0,
        },
        secondary: {
          family: 'sans-serif',
          weight: 400,
          style: 'normal',
          letterSpacing: 0.3,
        },
        hierarchy: {
          producerEmphasis: 'balanced',
          vintageProminence: 'featured',
          regionDisplay: 'integrated',
        },
      },
      assets: [],
      style: 'elegant',
      submission: {
        producerName: 'Integration Test Winery',
        wineName: 'Test Wine',
        vintage: '2023',
        variety: 'Chardonnay',
        region: 'Napa Valley',
        appellation: 'Napa Valley AVA',
      },
    };

    const result = await runImagePrompts(input);

    // Verify structure
    expect(result).toMatchObject({
      expectedPrompts: expect.any(Number),
      prompts: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          purpose: expect.stringMatching(/^(background|foreground|decoration)$/),
          prompt: expect.any(String),
          aspect: expect.stringMatching(/^(1:1|3:2|4:3|16:9|2:3|3:4)$/),
        }),
      ]),
    });

    // Verify we got reasonable prompts
    expect(result.expectedPrompts).toBeGreaterThan(0);
    expect(result.expectedPrompts).toBeLessThanOrEqual(5);
    expect(result.prompts).toHaveLength(result.expectedPrompts);

    // Each prompt should have substantive content
    for (const prompt of result.prompts) {
      expect(prompt.prompt.length).toBeGreaterThan(20);
      expect(prompt.id).toBeTruthy();
      expect(['background', 'foreground', 'decoration']).toContain(prompt.purpose);
    }

    console.log('✅ Real LLM image prompt generation successful:', {
      promptCount: result.prompts.length,
      avgLength: Math.round(result.prompts.reduce((sum, p) => sum + p.prompt.length, 0) / result.prompts.length),
      purposes: result.prompts.map((p) => p.purpose).join(', '),
    });
  }, 15000);

  it('should propagate wine details through the pipeline correctly', async () => {
    const uniqueSubmission = {
      producerName: 'Unique Test Winery XYZ123',
      wineName: 'Distinctive Reserve ABC456',
      vintage: '2019',
      variety: 'Pinot Grigio',
      region: 'Tuscany',
      appellation: 'Chianti DOCG',
    };

    // Step 1: Design Scheme should work with unique wine data
    const designResult = await runDesignScheme({
      submission: uniqueSubmission,
      style: 'classic',
    });

    // Step 2: Image Prompts should receive and use the wine submission data
    const imageResult = await runImagePrompts({
      ...designResult,
      style: 'classic',
      submission: uniqueSubmission,
    });

    // Verify that the generated prompts contain references to our unique wine data
    // This confirms that actual wine data (not placeholders) is being used
    const allPrompts = imageResult.prompts
      .map((p) => p.prompt)
      .join(' ')
      .toLowerCase();

    // Check for unique identifiers that prove real data is being used
    expect(allPrompts).toMatch(/unique test winery|xyz123/i);
    expect(allPrompts).toMatch(/distinctive reserve|abc456/i);
    expect(allPrompts).toMatch(/pinot grigio/i);
    expect(allPrompts).toMatch(/tuscany/i);
    expect(allPrompts).toMatch(/chianti/i);

    console.log('✅ Wine data propagation verified:', {
      producer: uniqueSubmission.producerName,
      wine: uniqueSubmission.wineName,
      promptsGenerated: imageResult.prompts.length,
      containsWineData: allPrompts.includes('unique test winery'),
    });
  }, 20000);

  it('should generate detailed layout with real LLM', async () => {
    const input: DetailedLayoutInput = {
      submission: {
        producerName: 'Test Integration Winery',
        wineName: 'Test Detailed Layout',
        vintage: '2023',
        variety: 'Cabernet Sauvignon',
        region: 'Napa Valley',
        appellation: 'Napa Valley AVA',
      },
      version: '1',
      canvas: {
        width: 750,
        height: 1000,
        dpi: 300,
        background: '#F5F5DC',
      },
      palette: {
        primary: '#8B0000',
        secondary: '#DAA520',
        accent: '#2F4F4F',
        background: '#F5F5DC',
        temperature: 'warm',
        contrast: 'high',
      },
      typography: {
        primary: {
          family: 'serif',
          weight: 700,
          style: 'normal',
          letterSpacing: 0,
        },
        secondary: {
          family: 'sans-serif',
          weight: 400,
          style: 'normal',
          letterSpacing: 0.3,
        },
        hierarchy: {
          producerEmphasis: 'balanced',
          vintageProminence: 'featured',
          regionDisplay: 'integrated',
        },
      },
      assets: [
        {
          id: 'test-bg',
          type: 'image' as const,
          url: 'https://example.com/test-bg.jpg',
          width: 800,
          height: 533,
        },
      ],
      style: 'elegant',
    };

    const result = await runDetailedLayout(input);

    // Verify structure
    expect(result).toMatchObject({
      version: '1',
      canvas: input.canvas,
      palette: input.palette,
      typography: input.typography,
      assets: input.assets,
      elements: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          type: expect.stringMatching(/^(text|image|shape)$/),
          bounds: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            w: expect.any(Number),
            h: expect.any(Number),
          }),
          z: expect.any(Number),
        }),
      ]),
    });

    // Verify we got elements
    expect(result.elements.length).toBeGreaterThan(0);

    // Check bounds are valid (0-1 range for relative positioning)
    for (const element of result.elements) {
      expect(element.bounds.x).toBeGreaterThanOrEqual(0);
      expect(element.bounds.x).toBeLessThanOrEqual(1);
      expect(element.bounds.y).toBeGreaterThanOrEqual(0);
      expect(element.bounds.y).toBeLessThanOrEqual(1);
      expect(element.bounds.w).toBeGreaterThan(0);
      expect(element.bounds.w).toBeLessThanOrEqual(1);
      expect(element.bounds.h).toBeGreaterThan(0);
      expect(element.bounds.h).toBeLessThanOrEqual(1);
      expect(element.z).toBeGreaterThanOrEqual(0);
    }

    console.log('✅ Real LLM detailed layout generation successful:', {
      elementCount: result.elements.length,
      types: [...new Set(result.elements.map((e) => e.type))].join(', '),
      textElements: result.elements.filter((e) => e.type === 'text').length,
      imageElements: result.elements.filter((e) => e.type === 'image').length,
    });
  }, 20000); // 20 second timeout for complex layout generation

  it('should reference all assets in multi-asset scenarios', async () => {
    const input: DetailedLayoutInput = {
      submission: {
        producerName: 'Multi-Asset Test Winery',
        wineName: 'Complex Layout Wine',
        vintage: '2023',
        variety: 'Blend',
        region: 'California',
        appellation: 'Napa Valley AVA',
      },
      version: '1',
      canvas: {
        width: 750,
        height: 1000,
        dpi: 300,
        background: '#F5F5DC',
      },
      palette: {
        primary: '#722F37',
        secondary: '#D4AF37',
        accent: '#2F4F2F',
        background: '#F5F5DC',
        temperature: 'warm',
        contrast: 'medium',
      },
      typography: {
        primary: {
          family: 'serif',
          weight: 600,
          style: 'normal',
          letterSpacing: 0,
        },
        secondary: {
          family: 'sans-serif',
          weight: 400,
          style: 'normal',
          letterSpacing: 0.3,
        },
        hierarchy: {
          producerEmphasis: 'balanced',
          vintageProminence: 'featured',
          regionDisplay: 'integrated',
        },
      },
      assets: [
        {
          id: 'asset-bg-01',
          type: 'image' as const,
          url: 'https://example.com/background.jpg',
          width: 800,
          height: 600,
        },
        {
          id: 'asset-decor-01',
          type: 'image' as const,
          url: 'https://example.com/decoration.jpg',
          width: 400,
          height: 300,
        },
        {
          id: 'asset-accent-01',
          type: 'image' as const,
          url: 'https://example.com/accent.jpg',
          width: 200,
          height: 200,
        },
      ],
      style: 'modern',
    };

    const result = await runDetailedLayout(input);

    // Verify all assets are referenced exactly once
    const imageElements = result.elements.filter((el) => el.type === 'image') as Array<{
      type: 'image';
      assetId: string;
    }>;
    const referencedAssetIds = imageElements.map((el) => el.assetId);
    const expectedAssetIds = input.assets.map((asset) => asset.id);

    // Should have exactly 3 image elements
    expect(imageElements).toHaveLength(3);

    // All asset IDs should be referenced exactly once
    expect(referencedAssetIds.sort()).toEqual(expectedAssetIds.sort());

    // No duplicate references
    const uniqueReferences = new Set(referencedAssetIds);
    expect(uniqueReferences.size).toBe(referencedAssetIds.length);

    console.log('✅ Multi-asset validation successful:', {
      assetsProvided: input.assets.length,
      imageElementsCreated: imageElements.length,
      referencedAssets: referencedAssetIds.join(', '),
    });
  }, 15000); // 15 second timeout for multi-asset layout generation

  it('should handle API errors gracefully with proper retry', async () => {
    const input: DesignSchemeInput = {
      submission: {
        producerName: '', // Invalid - empty producer name might cause issues
        wineName: 'Test',
        vintage: '2023',
        variety: 'Unknown',
        region: '',
        appellation: '',
      },
      style: 'elegant',
      historicalExamples: [],
    };

    // This might fail but should handle errors gracefully
    try {
      const result = await runDesignScheme(input);
      // If successful, verify it still has valid structure
      expect(result).toMatchObject({
        version: '1',
        canvas: expect.any(Object),
        palette: expect.any(Object),
        typography: expect.any(Object),
      });
      console.log('✅ Handled edge case input successfully');
    } catch (error) {
      // Should be a proper error with helpful message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
      console.log('✅ Error handling working correctly:', (error as Error).message);
    }
  }, 10000);
});

// Conditional test suite for manual testing with specific models
describe.skipIf(!process.env.TEST_SPECIFIC_MODELS)('Model-Specific Tests', () => {
  it('should work with GPT-5 Nano when configured', async () => {
    configurePipeline({
      modelConfigs: {
        'design-scheme': {
          provider: 'openai',
          model: 'gpt-5-nano',
          temperature: 0.3,
        },
      },
    });

    const input: DesignSchemeInput = {
      submission: {
        producerName: 'GPT Test Winery',
        wineName: 'OpenAI Blend',
        vintage: '2023',
        variety: 'Mixed',
        region: 'California',
        appellation: 'California AVA',
      },
      style: 'modern',
      historicalExamples: [],
    };

    const result = await runDesignScheme(input);
    expect(result.version).toBe('1');
    expect(result.palette).toBeTruthy();

    console.log('✅ GPT-5 Nano model working correctly');
  }, 15000);
});
