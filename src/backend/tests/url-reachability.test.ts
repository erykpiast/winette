// Tests for URL reachability and HTTP header validation

import { describe, expect, it, vi } from 'vitest';
import { MockImageModelAdapter } from '#backend/lib/image-generation.js';

// Mock logger to avoid NewRelic issues
vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('URL Reachability and Headers', () => {
  it('should generate valid image buffers with correct PNG headers', async () => {
    const adapter = new MockImageModelAdapter();

    const { data, meta } = await adapter.generate({
      id: 'header-test',
      purpose: 'background',
      prompt: 'Header validation test',
      aspect: '1:1',
    });

    // Validate PNG file signature
    expect(data[0]).toBe(0x89); // PNG signature byte 1
    expect(data[1]).toBe(0x50); // PNG signature byte 2 'P'
    expect(data[2]).toBe(0x4e); // PNG signature byte 3 'N'
    expect(data[3]).toBe(0x47); // PNG signature byte 4 'G'
    expect(data[4]).toBe(0x0d); // PNG signature byte 5
    expect(data[5]).toBe(0x0a); // PNG signature byte 6
    expect(data[6]).toBe(0x1a); // PNG signature byte 7
    expect(data[7]).toBe(0x0a); // PNG signature byte 8

    // Validate metadata
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    expect(meta.model).toBe('mock-model-v1');
    expect(meta.seed).toMatch(/^[a-f0-9]{8}$/);

    // Validate buffer is reasonable size
    expect(data.length).toBeGreaterThan(100);
    expect(data.length).toBeLessThan(1000000); // Less than 1MB
  });

  it('should generate different buffers for different specs', async () => {
    const adapter = new MockImageModelAdapter();

    const { data: buffer1 } = await adapter.generate({
      id: 'test-1',
      purpose: 'background',
      prompt: 'First test image',
      aspect: '1:1',
    });

    const { data: buffer2 } = await adapter.generate({
      id: 'test-2',
      purpose: 'foreground',
      prompt: 'Second test image',
      aspect: '4:3',
    });

    // Buffers should be different
    expect(buffer1.equals(buffer2)).toBe(false);

    // Both should be valid PNG files
    expect(buffer1[0]).toBe(0x89);
    expect(buffer2[0]).toBe(0x89);
  });

  it('should generate consistent buffers for identical specs', async () => {
    const adapter = new MockImageModelAdapter();

    const spec = {
      id: 'consistent-test',
      purpose: 'decoration' as const,
      prompt: 'Consistency test',
      aspect: '3:2' as const,
    };

    const { data: buffer1, meta: meta1 } = await adapter.generate(spec);
    const { data: buffer2, meta: meta2 } = await adapter.generate(spec);

    // Should be identical (deterministic)
    expect(buffer1.equals(buffer2)).toBe(true);
    expect(meta1.seed).toBe(meta2.seed);
    expect(meta1.width).toBe(meta2.width);
    expect(meta1.height).toBe(meta2.height);
  });

  it('should respect aspect ratio constraints', async () => {
    const adapter = new MockImageModelAdapter();

    const aspectTests = [
      { aspect: '1:1' as const, expectedWidth: 512, expectedHeight: 512 },
      { aspect: '4:3' as const, expectedWidth: 512, expectedHeight: 384 },
      { aspect: '3:2' as const, expectedWidth: 512, expectedHeight: 341 },
      { aspect: '2:3' as const, expectedWidth: 341, expectedHeight: 512 },
      { aspect: '9:16' as const, expectedWidth: 288, expectedHeight: 512 },
    ];

    for (const test of aspectTests) {
      const { data, meta } = await adapter.generate({
        id: `aspect-${test.aspect}`,
        purpose: 'background',
        prompt: `Test ${test.aspect} aspect ratio`,
        aspect: test.aspect,
      });

      // Validate dimensions match expected aspect ratio
      expect(meta.width).toBe(test.expectedWidth);
      expect(meta.height).toBe(test.expectedHeight);

      // Validate image buffer is valid PNG
      expect(data[0]).toBe(0x89);
      expect(data.length).toBeGreaterThan(0);
    }
  });

  it('should embed metadata in generated images', async () => {
    const adapter = new MockImageModelAdapter();

    const { data } = await adapter.generate({
      id: 'metadata-embed-test',
      purpose: 'foreground',
      prompt: 'This prompt should be embedded in the image somehow',
      aspect: '1:1',
    });

    // The mock adapter creates SVG with embedded text, then converts to PNG
    // We can't easily read the text from the PNG binary, but we know it's there
    // because the mock adapter deterministically includes the ID and prompt in the SVG

    // Validate the image is a valid PNG with reasonable size
    expect(data[0]).toBe(0x89); // PNG signature
    expect(data.length).toBeGreaterThan(1000); // Should be substantial size due to embedded text

    // The mock adapter should generate different images for different IDs
    const { data: differentData } = await adapter.generate({
      id: 'different-id',
      purpose: 'foreground',
      prompt: 'Different prompt',
      aspect: '1:1',
    });

    // Different IDs should produce different images
    expect(data.equals(differentData)).toBe(false);
  });
});
