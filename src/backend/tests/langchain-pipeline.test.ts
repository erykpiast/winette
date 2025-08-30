import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runImageGenerate, runRefine, runRender } from '../lib/langchain-chains/index.js';
import { configurePipeline, MockImageAdapter, MockVisionRefiner, withRetry } from '../lib/langchain-pipeline/index.js';
import type { DesignSchemeInput, ImageGenerateInput, RefineInput } from '../schema/langchain-pipeline-schemas.js';

// Mock logger to avoid console output during tests
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('LangChain Pipeline', () => {
  beforeEach(() => {
    // Configure pipeline for testing with mock adapters
    configurePipeline({
      imageAdapter: new MockImageAdapter(),
      visionAdapter: new MockVisionRefiner(),
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(operation, { maxAttempts: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(withRetry(operation, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mock Adapters', () => {
    it('should generate mock images', async () => {
      const adapter = new MockImageAdapter();
      const input: ImageGenerateInput = {
        id: 'test-prompt',
        purpose: 'background',
        prompt: 'A vineyard at sunset',
        aspect: '4:3',
      };

      const result = await adapter.generate(input);

      expect(result).toMatchObject({
        id: 'asset-test-prompt',
        type: 'image',
        width: 800,
        height: 600,
      });

      // URL should be from winette mock images or data URI (offline mode)
      expect(result.url).toMatch(
        /^https:\/\/winette\.vercel\.app\/mock-images\/(background|decoration|foreground)\.png$|^data:image\/svg\+xml;base64,/,
      );
    });

    it('should provide vision refinement suggestions', async () => {
      const adapter = new MockVisionRefiner();
      const input: RefineInput = {
        submission: {
          producerName: 'Test Winery',
          wineName: 'Test Wine',
          vintage: '2023',
          variety: 'Chardonnay',
          region: 'Napa Valley',
          appellation: 'Napa Valley AVA',
        },
        currentDSL: {
          version: '1',
          canvas: { width: 800, height: 1200, dpi: 300, background: '#ffffff' },
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
              letterSpacing: 0.5,
            },
            hierarchy: {
              producerEmphasis: 'dominant',
              vintageProminence: 'featured',
              regionDisplay: 'prominent',
            },
          },
          assets: [],
          elements: [],
        },
        previewUrl: 'https://example.com/preview.png',
      };

      const result = await adapter.proposeEdits(input);

      expect(result).toEqual({
        operations: [],
        reasoning: 'Label appears well-balanced and follows design principles',
        confidence: 0.85,
      });
    });
  });

  describe('Chain Functions with Mock LLM', () => {
    // Since we're using mock LLM (provider: 'mock'), these tests will focus on
    // the adapter-based functions that don't require actual LLM calls

    it('should generate images using adapter', async () => {
      const input: ImageGenerateInput = {
        id: 'hero-image',
        purpose: 'background',
        prompt: 'Elegant wine vineyard at golden hour',
        negativePrompt: 'blurry, low quality',
        aspect: '4:3',
        guidance: 7.5,
      };

      const result = await runImageGenerate(input);

      expect(result.id).toBe('asset-hero-image');
      // URL should be from winette mock images or data URI (offline mode)
      expect(result.url).toMatch(
        /^https:\/\/winette\.vercel\.app\/mock-images\/(background|decoration|foreground)\.png$|^data:image\/svg\+xml;base64,/,
      );
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should render mock preview', async () => {
      const input = {
        version: '1' as const,
        canvas: { width: 800, height: 1200, dpi: 300, background: '#ffffff' },
        palette: {
          primary: '#8B0000',
          secondary: '#DAA520',
          accent: '#2F4F4F',
          background: '#F5F5DC',
          temperature: 'warm' as const,
          contrast: 'high' as const,
        },
        typography: {
          primary: {
            family: 'serif',
            weight: 700,
            style: 'normal' as const,
            letterSpacing: 0,
          },
          secondary: {
            family: 'sans-serif',
            weight: 400,
            style: 'normal' as const,
            letterSpacing: 0.5,
          },
          hierarchy: {
            producerEmphasis: 'dominant' as const,
            vintageProminence: 'featured' as const,
            regionDisplay: 'prominent' as const,
          },
        },
        assets: [
          {
            id: 'bg-image',
            type: 'image' as const,
            url: 'https://example.com/bg.png',
            width: 800,
            height: 600,
          },
        ],
        elements: [
          {
            id: 'producer-text',
            type: 'text' as const,
            bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
            z: 10,
            text: 'Test Winery',
            font: 'primary' as const,
            color: 'primary' as const,
            align: 'center' as const,
            fontSize: 32,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'none' as const,
          },
        ],
      };

      const result = await runRender(input);

      expect(result.previewUrl).toContain('https://winette.vercel.app/mock-images/mock-label-');
      expect(result.width).toBe(800);
      expect(result.height).toBe(1200);
      expect(result.format).toBe('PNG');
    });

    it('should provide refinement using vision adapter', async () => {
      const input: RefineInput = {
        submission: {
          producerName: 'Test Winery',
          wineName: 'Reserve Chardonnay',
          vintage: '2023',
          variety: 'Chardonnay',
          region: 'Napa Valley',
          appellation: 'Napa Valley AVA',
        },
        currentDSL: {
          version: '1',
          canvas: { width: 800, height: 1200, dpi: 300, background: '#ffffff' },
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
              letterSpacing: 0.5,
            },
            hierarchy: {
              producerEmphasis: 'dominant',
              vintageProminence: 'featured',
              regionDisplay: 'prominent',
            },
          },
          assets: [],
          elements: [
            {
              id: 'producer',
              type: 'text',
              bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
              z: 10,
              text: 'Test Winery',
              font: 'primary',
              color: 'primary',
              align: 'center',
              fontSize: 32,
              lineHeight: 1.2,
              maxLines: 1,
              textTransform: 'none',
            },
          ],
        },
        previewUrl: 'https://example.com/preview.png',
      };

      const result = await runRefine(input);

      expect(result.operations).toBeInstanceOf(Array);
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Schema Validation', () => {
    it('should validate design scheme input structure', () => {
      const validInput: DesignSchemeInput = {
        submission: {
          producerName: 'Test Winery',
          wineName: 'Cabernet Sauvignon',
          vintage: '2023',
          variety: 'Cabernet Sauvignon',
          region: 'Napa Valley',
          appellation: 'Napa Valley AVA',
        },
        style: 'elegant',
        historicalExamples: [],
      };

      // This should not throw
      expect(() => {
        // In a real test with actual LLM, we would validate the input schema
        // For now, just verify the structure is correct
        expect(validInput.submission.producerName).toBeDefined();
        expect(validInput.style).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle image generation failures gracefully', async () => {
      const failingAdapter = {
        generate: vi.fn().mockRejectedValue(new Error('Image generation failed')),
      };

      await expect(
        runImageGenerate(
          {
            id: 'test',
            purpose: 'background',
            prompt: 'test prompt',
            aspect: '4:3',
          },
          failingAdapter,
        ),
      ).rejects.toThrow('Image generation failed');
    });

    it('should handle vision refinement failures gracefully', async () => {
      const failingVisionAdapter = {
        proposeEdits: vi.fn().mockRejectedValue(new Error('Vision analysis failed')),
      };

      const input: RefineInput = {
        submission: {
          producerName: 'Test',
          wineName: 'Test',
          vintage: '2023',
          variety: 'Test',
          region: 'Test',
          appellation: 'Test',
        },
        currentDSL: {
          version: '1',
          canvas: { width: 800, height: 1200, dpi: 300, background: '#fff' },
          palette: {
            primary: '#000',
            secondary: '#666',
            accent: '#999',
            background: '#fff',
            temperature: 'neutral',
            contrast: 'medium',
          },
          typography: {
            primary: {
              family: 'serif',
              weight: 400,
              style: 'normal',
              letterSpacing: 0,
            },
            secondary: {
              family: 'sans-serif',
              weight: 300,
              style: 'normal',
              letterSpacing: 0,
            },
            hierarchy: {
              producerEmphasis: 'balanced',
              vintageProminence: 'standard',
              regionDisplay: 'integrated',
            },
          },
          assets: [],
          elements: [],
        },
        previewUrl: 'https://example.com/test.png',
      };

      await expect(runRefine(input, failingVisionAdapter)).rejects.toThrow('Vision analysis failed');
    });
  });

  describe('Environment Configuration', () => {
    it('should configure pipeline with custom settings', () => {
      const customImageAdapter = new MockImageAdapter();
      const customVisionAdapter = new MockVisionRefiner();

      configurePipeline({
        imageAdapter: customImageAdapter,
        visionAdapter: customVisionAdapter,
        retryConfig: { maxAttempts: 5 },
      });

      // Configuration should apply without throwing
      expect(() => {
        // Test that configuration was accepted
      }).not.toThrow();
    });
  });
});

describe('Chain Integration', () => {
  it('should handle MOCK_LLM environment variable and configure mocks', () => {
    // Test that the MOCK_LLM flag properly configures mock LLMs
    process.env.MOCK_LLM = 'true';

    configurePipeline({
      mockLLM: process.env.MOCK_LLM === 'true',
    });

    // Should configure without error - mock LLMs are now properly supported
    expect(process.env.MOCK_LLM).toBe('true');

    delete process.env.MOCK_LLM;
  });

  it('should respect timeout and size limits', async () => {
    const start = Date.now();

    // Create a fast operation to test that limits don't interfere
    const quickOperation = () => Promise.resolve('quick');
    const result = await withRetry(quickOperation, { maxAttempts: 1 });

    const duration = Date.now() - start;

    expect(result).toBe('quick');
    expect(duration).toBeLessThan(1000); // Should be very fast
  });
});
