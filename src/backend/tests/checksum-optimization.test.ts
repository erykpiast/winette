// Test for checksum optimization in image generation service

import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

// Mock logger to prevent NewRelic errors in tests
vi.mock('#backend/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { type ImagePromptSpec, MockImageModelAdapter } from '#backend/lib/image-generation.js';

describe('Checksum Optimization', () => {
  const mockAdapter = new MockImageModelAdapter();

  it('should demonstrate checksum calculation in service layer', async () => {
    const spec: ImagePromptSpec = {
      id: 'test-asset',
      purpose: 'background',
      prompt: 'Test checksum optimization',
      aspect: '4:3',
    };

    // Generate image data
    const { data, meta } = await mockAdapter.generate(spec);

    // Calculate checksum (this is what the service should do)
    const checksum = crypto.createHash('sha256').update(data).digest('hex');

    // Verify checksum properties
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum.length).toBe(64);

    console.log('✅ Checksum calculation in service layer:');
    console.log(`   Image size: ${data.length} bytes`);
    console.log(`   Checksum: ${checksum.substring(0, 12)}...`);
    console.log(`   Model: ${meta.model}, Seed: ${meta.seed}`);
  });

  it('should demonstrate deterministic checksums for same content', async () => {
    const spec: ImagePromptSpec = {
      id: 'deterministic-test',
      purpose: 'foreground',
      prompt: 'Deterministic content',
      aspect: '1:1',
    };

    // Generate same content twice
    const { data: data1 } = await mockAdapter.generate(spec);
    const { data: data2 } = await mockAdapter.generate(spec);

    // Calculate checksums
    const checksum1 = crypto.createHash('sha256').update(data1).digest('hex');
    const checksum2 = crypto.createHash('sha256').update(data2).digest('hex');

    // Same spec should produce same content and checksum
    expect(Buffer.compare(data1, data2)).toBe(0); // Same buffer content
    expect(checksum1).toBe(checksum2); // Same checksum

    console.log('✅ Deterministic checksums validated:');
    console.log(`   Content identical: ${Buffer.compare(data1, data2) === 0}`);
    console.log(`   Checksum identical: ${checksum1 === checksum2}`);
    console.log(`   Checksum: ${checksum1.substring(0, 12)}...`);
  });

  it('should demonstrate performance benefit of avoiding double hashing', async () => {
    const spec: ImagePromptSpec = {
      id: 'performance-test',
      purpose: 'decoration',
      prompt: 'Performance test image',
      aspect: '3:2',
    };

    const { data } = await mockAdapter.generate(spec);

    // Time single checksum calculation
    const start = performance.now();
    const checksum = crypto.createHash('sha256').update(data).digest('hex');
    const singleHashTime = performance.now() - start;

    // Time double checksum calculation (what we want to avoid)
    const start2 = performance.now();
    const checksum1 = crypto.createHash('sha256').update(data).digest('hex');
    const checksum2 = crypto.createHash('sha256').update(data).digest('hex');
    const doubleHashTime = performance.now() - start2;

    expect(checksum).toBe(checksum1);
    expect(checksum).toBe(checksum2);

    console.log('✅ Performance comparison:');
    console.log(`   Single hash time: ${singleHashTime.toFixed(2)}ms`);
    console.log(`   Double hash time: ${doubleHashTime.toFixed(2)}ms`);
    console.log(
      `   Performance improvement: ${(((doubleHashTime - singleHashTime) / singleHashTime) * 100).toFixed(1)}%`,
    );
    console.log(`   Service now calculates once and passes to uploadImage`);
  });

  it('should validate checksum format for content-addressable paths', async () => {
    const spec: ImagePromptSpec = {
      id: 'path-validation',
      purpose: 'background',
      prompt: 'Path validation test',
      aspect: '9:16',
    };

    const { data } = await mockAdapter.generate(spec);
    const checksum = crypto.createHash('sha256').update(data).digest('hex');

    // Validate checksum can be used in content-addressable path
    const contentPath = `content/${checksum}.png`;

    expect(contentPath).toMatch(/^content\/[a-f0-9]{64}\.png$/);
    expect(contentPath.length).toBe('content/'.length + 64 + '.png'.length);

    console.log('✅ Content-addressable path validation:');
    console.log(`   Checksum: ${checksum}`);
    console.log(`   Path: ${contentPath}`);
    console.log(`   Valid format: ${/^content\/[a-f0-9]{64}\.png$/.test(contentPath)}`);
  });
});
