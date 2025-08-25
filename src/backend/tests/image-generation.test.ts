// Phase 1.3.4.3: Image Generation Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImagePromptSpec } from '#backend/lib/image-generation.js';
import { MockImageModelAdapter } from '#backend/lib/image-generation.js';
import { ImageGenerationService } from '#backend/services/image-generation-service.js';

// Mock dependencies
vi.mock('#backend/lib/database.js', () => ({
  supabase: null, // Simulate no supabase connection for unit tests
}));

vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('#backend/lib/image-storage.js', () => ({
  initializeImageStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('#backend/lib/image-generation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#backend/lib/image-generation.js')>();
  return {
    ...actual,
    uploadImage: vi.fn().mockImplementation(() => {
      // Mock should accept all parameters including metadata
      return Promise.resolve({
        url: 'https://example.com/test-image.png',
        width: 512,
        height: 512,
        format: 'png',
        checksum: 'abc123',
      });
    }),
  };
});

describe('MockImageModelAdapter', () => {
  let adapter: MockImageModelAdapter;

  beforeEach(() => {
    adapter = new MockImageModelAdapter();
  });

  it('should generate deterministic images based on spec', async () => {
    const spec: ImagePromptSpec = {
      id: 'test-background',
      purpose: 'background',
      prompt: 'A vineyard landscape at sunset',
      aspect: '4:3',
    };

    const result1 = await adapter.generate(spec);
    const result2 = await adapter.generate(spec);

    // Should be deterministic
    expect(result1.meta.seed).toBe(result2.meta.seed);
    expect(result1.meta.model).toBe('mock-model-v1');
    expect(result1.meta.width).toBe(512);
    expect(result1.meta.height).toBe(384); // 4:3 aspect ratio
    expect(result1.data).toBeInstanceOf(Buffer);
    expect(result1.data.length).toBeGreaterThan(0);
  });

  it('should generate different seeds for different specs', async () => {
    const spec1: ImagePromptSpec = {
      id: 'background-1',
      purpose: 'background',
      prompt: 'Vineyard sunset',
      aspect: '1:1',
    };

    const spec2: ImagePromptSpec = {
      id: 'background-2',
      purpose: 'background',
      prompt: 'Wine cellar',
      aspect: '1:1',
    };

    const result1 = await adapter.generate(spec1);
    const result2 = await adapter.generate(spec2);

    expect(result1.meta.seed).not.toBe(result2.meta.seed);
  });

  it('should handle different aspect ratios correctly', async () => {
    const aspectTests = [
      { aspect: '1:1' as const, expectedWidth: 512, expectedHeight: 512 },
      { aspect: '4:3' as const, expectedWidth: 512, expectedHeight: 384 },
      { aspect: '3:2' as const, expectedWidth: 512, expectedHeight: 341 },
      { aspect: '2:3' as const, expectedWidth: 341, expectedHeight: 512 },
      { aspect: '9:16' as const, expectedWidth: 288, expectedHeight: 512 },
    ];

    for (const test of aspectTests) {
      const spec: ImagePromptSpec = {
        id: `test-${test.aspect}`,
        purpose: 'background',
        prompt: 'Test image',
        aspect: test.aspect,
      };

      const result = await adapter.generate(spec);

      expect(result.meta.width).toBe(test.expectedWidth);
      expect(result.meta.height).toBe(test.expectedHeight);
    }
  });
});

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;
  let mockAdapter: MockImageModelAdapter;

  beforeEach(() => {
    mockAdapter = new MockImageModelAdapter();
    service = new ImageGenerationService({
      adapter: mockAdapter,
      maxConcurrentGenerations: 2,
    });
  });

  it('should initialize successfully', async () => {
    await expect(service.initialize()).resolves.not.toThrow();
  });

  it('should process empty specs array', async () => {
    const result = await service.generateAndStoreImages('gen-123', []);

    expect(result.updatedAssets).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should generate and store multiple images', async () => {
    const specs: ImagePromptSpec[] = [
      {
        id: 'background',
        purpose: 'background',
        prompt: 'Vineyard landscape',
        aspect: '4:3',
      },
      {
        id: 'foreground',
        purpose: 'foreground',
        prompt: 'Wine bottle silhouette',
        aspect: '2:3',
      },
    ];

    const result = await service.generateAndStoreImages('gen-123', specs);

    expect(result.updatedAssets).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    expect(result.updatedAssets[0]).toMatchObject({
      id: 'background',
      type: 'image',
      url: expect.stringContaining('https://'),
      width: expect.any(Number),
      height: expect.any(Number),
    });

    expect(result.updatedAssets[1]).toMatchObject({
      id: 'foreground',
      type: 'image',
      url: expect.stringContaining('https://'),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('should handle generation failures gracefully', async () => {
    // Create a mock adapter that fails
    const failingAdapter = {
      generate: vi.fn().mockRejectedValue(new Error('Generation failed')),
    };

    const failingService = new ImageGenerationService({
      adapter: failingAdapter,
      maxConcurrentGenerations: 1,
    });

    const specs: ImagePromptSpec[] = [
      {
        id: 'failing-image',
        purpose: 'background',
        prompt: 'This will fail',
        aspect: '1:1',
      },
    ];

    const result = await failingService.generateAndStoreImages('gen-123', specs);

    expect(result.updatedAssets).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Generation failed');
  });

  it('should process batches with concurrency limits', async () => {
    const generateSpy = vi.spyOn(mockAdapter, 'generate');

    const specs: ImagePromptSpec[] = Array.from({ length: 5 }, (_, i) => ({
      id: `image-${i}`,
      purpose: 'background' as const,
      prompt: `Test image ${i}`,
      aspect: '1:1' as const,
    }));

    const result = await service.generateAndStoreImages('gen-123', specs);

    expect(result.updatedAssets).toHaveLength(5);
    expect(result.errors).toHaveLength(0);
    expect(generateSpy).toHaveBeenCalledTimes(5);
  });
});

describe('Integration Tests', () => {
  it('should create valid image buffers', async () => {
    const adapter = new MockImageModelAdapter();

    const spec: ImagePromptSpec = {
      id: 'integration-test',
      purpose: 'background',
      prompt: 'Test image for integration',
      aspect: '1:1',
    };

    const { data, meta } = await adapter.generate(spec);

    // Verify it's a valid PNG buffer
    expect(data[0]).toBe(0x89); // PNG magic number first byte
    expect(data[1]).toBe(0x50); // PNG magic number second byte
    expect(data[2]).toBe(0x4e); // PNG magic number third byte
    expect(data[3]).toBe(0x47); // PNG magic number fourth byte

    expect(meta).toMatchObject({
      model: 'mock-model-v1',
      seed: expect.any(String),
      width: 512,
      height: 512,
    });
  });
});
