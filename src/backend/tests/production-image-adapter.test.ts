import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch using Vitest's module mocking
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the dependencies
vi.mock('#backend/lib/langchain-pipeline/index.js', () => ({
  pipelineConfig: {
    adapters: {
      image: {
        generate: vi.fn(),
      },
    },
  },
}));

vi.mock('#backend/lib/production-config.js', () => ({
  autoConfigurePipeline: vi.fn(),
}));

vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Now import the modules and types
import type { ImagePromptSpec } from '#backend/lib/image-generation.js';
import { ProductionImageModelAdapter } from '#backend/lib/image-generation.js';
import { pipelineConfig } from '#backend/lib/langchain-pipeline/index.js';
import { logger } from '#backend/lib/logger.js';
import { autoConfigurePipeline } from '#backend/lib/production-config.js';

describe('ProductionImageModelAdapter', () => {
  let adapter: ProductionImageModelAdapter;
  let mockGenerate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerate = pipelineConfig.adapters.image.generate as ReturnType<typeof vi.fn>;

    adapter = new ProductionImageModelAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize and configure pipeline', () => {
      expect(autoConfigurePipeline).toHaveBeenCalled();
    });
  });

  describe('aspect ratio mapping', () => {
    it('should correctly map all supported aspect ratios', async () => {
      const testCases = [
        { input: '1:1' as const, expected: '1:1' },
        { input: '3:2' as const, expected: '3:2' },
        { input: '4:3' as const, expected: '4:3' },
        { input: '2:3' as const, expected: '2:3' },
        { input: '9:16' as const, expected: '2:3' }, // Portrait mapping
      ];

      // Mock successful LangChain response
      mockGenerate.mockResolvedValue({
        id: 'test-id',
        url: 'https://example.com/image.png',
        width: 1024,
        height: 1024,
      });

      // Mock successful fetch response
      const mockBuffer = Buffer.from('fake-image-data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockBuffer.buffer,
      } as Response);

      for (const { input, expected } of testCases) {
        mockGenerate.mockClear();

        const spec: ImagePromptSpec = {
          id: `test-${input}`,
          purpose: 'background',
          prompt: 'Test prompt',
          aspect: input,
          negativePrompt: 'test negative',
          guidance: 7.0,
        };

        await adapter.generate(spec);

        // Verify the correct aspect ratio was passed to LangChain
        expect(mockGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            aspect: expected,
          }),
        );
      }
    });

    it('should log approximation for 9:16 aspect ratio', async () => {
      // Mock successful LangChain response
      mockGenerate.mockResolvedValue({
        id: 'test-id',
        url: 'https://example.com/image.png',
        width: 1024,
        height: 1792,
      });

      // Mock successful fetch response
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('fake-image-data').buffer,
      } as Response);

      const spec: ImagePromptSpec = {
        id: 'test-9-16',
        purpose: 'background',
        prompt: 'Test portrait prompt',
        aspect: '9:16',
      };

      await adapter.generate(spec);

      // Verify approximation logging
      expect(logger.info).toHaveBeenCalledWith('Aspect ratio approximated for LangChain compatibility', {
        requested: '9:16',
        mapped: '2:3',
        note: 'LangChain does not support 9:16, using closest portrait ratio 2:3',
      });
    });
  });

  describe('image generation integration', () => {
    it('should successfully convert LangChain URL response to Buffer format', async () => {
      const mockLangChainResponse = {
        id: 'langchain-test-id',
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        width: 1792,
        height: 1024,
      };

      mockGenerate.mockResolvedValue(mockLangChainResponse);

      // Mock fetch for data URL
      const mockImageBuffer = Buffer.from('R0lGODlhAQABAAAAACwAAAAAAQABAAA=', 'base64');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockImageBuffer.buffer,
      } as Response);

      const spec: ImagePromptSpec = {
        id: 'integration-test',
        purpose: 'decoration',
        prompt: 'Test integration prompt',
        aspect: '3:2',
        negativePrompt: 'blur, low quality',
        guidance: 8.0,
      };

      const result = await adapter.generate(spec);

      // Verify LangChain adapter was called with correct parameters
      expect(mockGenerate).toHaveBeenCalledWith({
        id: 'integration-test',
        purpose: 'decoration',
        prompt: 'Test integration prompt',
        aspect: '3:2',
        negativePrompt: 'blur, low quality',
        guidance: 8.0,
      });

      // Verify return format matches ImageGenerationService expectations
      expect(result).toMatchObject({
        data: expect.any(Buffer),
        meta: {
          model: 'dall-e-3',
          seed: 'langchain-test-id',
          width: 1792,
          height: 1024,
        },
      });

      // Verify the data is a valid Buffer
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle LangChain generation errors', async () => {
      const mockError = new Error('LangChain generation failed');
      mockGenerate.mockRejectedValue(mockError);

      const spec: ImagePromptSpec = {
        id: 'error-test',
        purpose: 'background',
        prompt: 'Error test prompt',
        aspect: '1:1',
      };

      await expect(adapter.generate(spec)).rejects.toThrow('LangChain generation failed');
    });

    it('should handle image fetch errors', async () => {
      mockGenerate.mockResolvedValue({
        id: 'fetch-error-test',
        url: 'https://api.openai.com/invalid-url.png',
        width: 1024,
        height: 1024,
      });

      // Mock failed fetch response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const spec: ImagePromptSpec = {
        id: 'fetch-error-test',
        purpose: 'background',
        prompt: 'Fetch error test',
        aspect: '1:1',
      };

      await expect(adapter.generate(spec)).rejects.toThrow('Failed to fetch generated image: 404 Not Found');
    });
  });

  describe('input validation', () => {
    it('should handle optional parameters correctly', async () => {
      mockGenerate.mockResolvedValue({
        id: 'optional-test',
        url: 'https://example.com/image.png',
        width: 1024,
        height: 1024,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('test').buffer,
      } as Response);

      const specWithOptionals: ImagePromptSpec = {
        id: 'optional-test',
        purpose: 'decoration',
        prompt: 'Test with all parameters',
        aspect: '4:3',
        negativePrompt: 'unwanted elements',
        guidance: 9.0,
      };

      const specMinimal: ImagePromptSpec = {
        id: 'minimal-test',
        purpose: 'background',
        prompt: 'Test with minimal parameters',
        aspect: '1:1',
      };

      await adapter.generate(specWithOptionals);
      await adapter.generate(specMinimal);

      // Verify both calls worked correctly
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(mockGenerate).toHaveBeenNthCalledWith(1, {
        id: 'optional-test',
        purpose: 'decoration',
        prompt: 'Test with all parameters',
        aspect: '4:3',
        negativePrompt: 'unwanted elements',
        guidance: 9.0,
      });
      expect(mockGenerate).toHaveBeenNthCalledWith(2, {
        id: 'minimal-test',
        purpose: 'background',
        prompt: 'Test with minimal parameters',
        aspect: '1:1',
        negativePrompt: undefined,
        guidance: undefined,
      });
    });
  });
});
