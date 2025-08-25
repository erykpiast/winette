// Integration tests for real upload with URL and header validation
// These tests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables

import { beforeAll, describe, expect, it } from 'vitest';
import { supabase } from '#backend/lib/database.js';
import { MockImageModelAdapter, uploadImage } from '#backend/lib/image-generation.js';
import { initializeImageStorage } from '#backend/lib/image-storage.js';

describe('Integration: Real Upload and Validation', () => {
  const isIntegrationTest = process.env.INTEGRATION_TESTS === 'true' && !!supabase;

  beforeAll(async () => {
    if (!isIntegrationTest) {
      console.log('Skipping integration tests - set INTEGRATION_TESTS=true and configure Supabase to run');
      return;
    }

    // Initialize storage bucket
    await initializeImageStorage();
  });

  it.runIf(isIntegrationTest)('should perform real upload and validate public URL accessibility', async () => {
    const adapter = new MockImageModelAdapter();

    // Generate a real image buffer
    const { data: imageBuffer } = await adapter.generate({
      id: 'integration-test-image',
      purpose: 'background',
      prompt: 'Integration test image',
      aspect: '1:1',
    });

    // Upload the image
    const result = await uploadImage({
      generationId: 'integration-test-gen',
      assetId: 'integration-test-asset',
      data: imageBuffer,
      prompt: 'Integration test image',
      model: 'test-model',
      seed: 'test-seed',
    });

    // Validate upload result structure
    expect(result).toMatchObject({
      url: expect.stringContaining('https://'),
      width: expect.any(Number),
      height: expect.any(Number),
      format: expect.any(String),
      checksum: expect.any(String),
    });

    // Validate the URL is reachable
    const response = await fetch(result.url);
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    // Validate Content-Type header
    const contentType = response.headers.get('content-type');
    expect(contentType).toBe(`image/${result.format}`);

    // Validate Cache-Control headers
    const cacheControl = response.headers.get('cache-control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=31536000');
    expect(cacheControl).toContain('immutable');

    // Validate the response body is the same image
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    expect(responseBuffer.length).toBeGreaterThan(0);

    // The buffer should be a valid image (starts with PNG signature)
    expect(responseBuffer[0]).toBe(0x89); // PNG magic number
    expect(responseBuffer[1]).toBe(0x50);
    expect(responseBuffer[2]).toBe(0x4e);
    expect(responseBuffer[3]).toBe(0x47);

    console.log('✅ Integration test passed:', {
      url: result.url,
      contentType,
      cacheControl,
      imageSize: responseBuffer.length,
    });
  });

  it.runIf(isIntegrationTest)('should validate content-addressable path format', async () => {
    const adapter = new MockImageModelAdapter();

    const { data: imageBuffer } = await adapter.generate({
      id: 'path-test-image',
      purpose: 'foreground',
      prompt: 'Path format test',
      aspect: '4:3',
    });

    const result = await uploadImage({
      generationId: 'path-test-gen',
      assetId: 'path-test-asset',
      data: imageBuffer,
    });

    // URL should contain content-addressable path format
    const url = new URL(result.url);
    const pathSegments = url.pathname.split('/');

    // Expected format: /storage/v1/object/public/label-images/content/{checksum}.{ext}
    expect(pathSegments).toContain('label-images');
    expect(pathSegments).toContain('content');

    // Last segment should be checksum.format (content-addressable)
    const filename = pathSegments[pathSegments.length - 1];
    expect(filename).toMatch(/^[a-f0-9]{64}\.(png|jpg|webp)$/);

    console.log('✅ Content-addressable path validated:', url.pathname);
  });

  it.runIf(isIntegrationTest)('should handle deduplication in real environment', async () => {
    const adapter = new MockImageModelAdapter();

    // Generate deterministic image (same spec = same content)
    const spec = {
      id: 'dedup-test-image',
      purpose: 'decoration' as const,
      prompt: 'Deduplication test image',
      aspect: '2:3' as const,
    };

    const { data: imageBuffer1 } = await adapter.generate(spec);
    const { data: imageBuffer2 } = await adapter.generate(spec);

    // Buffers should be identical (deterministic generation)
    expect(imageBuffer1.equals(imageBuffer2)).toBe(true);

    // First upload
    const result1 = await uploadImage({
      generationId: 'dedup-test-gen',
      assetId: 'dedup-test-asset',
      data: imageBuffer1,
    });

    // Second upload with same content
    const result2 = await uploadImage({
      generationId: 'dedup-test-gen',
      assetId: 'dedup-test-asset',
      data: imageBuffer2,
    });

    // Should return identical results (deduplication worked)
    expect(result1).toEqual(result2);

    // URL should be accessible
    const response = await fetch(result2.url);
    expect(response.ok).toBe(true);

    console.log('✅ Deduplication test passed:', {
      url: result1.url,
      checksum: result1.checksum,
      identical: result1.url === result2.url,
    });
  });

  it.runIf(isIntegrationTest)('should validate different content gets different URLs', async () => {
    const adapter = new MockImageModelAdapter();

    // Generate two different images
    const { data: imageBuffer1 } = await adapter.generate({
      id: 'unique-test-1',
      purpose: 'background',
      prompt: 'First unique image',
      aspect: '1:1',
    });

    const { data: imageBuffer2 } = await adapter.generate({
      id: 'unique-test-2',
      purpose: 'background',
      prompt: 'Second unique image', // Different prompt = different content
      aspect: '1:1',
    });

    // Upload both images with same assetId but different content
    const result1 = await uploadImage({
      generationId: 'unique-test-gen',
      assetId: 'same-asset-id',
      data: imageBuffer1,
    });

    const result2 = await uploadImage({
      generationId: 'unique-test-gen',
      assetId: 'same-asset-id',
      data: imageBuffer2,
    });

    // Should have different URLs (different content)
    expect(result1.url).not.toBe(result2.url);
    expect(result1.checksum).not.toBe(result2.checksum);

    // Both URLs should be accessible
    const response1 = await fetch(result1.url);
    const response2 = await fetch(result2.url);
    expect(response1.ok).toBe(true);
    expect(response2.ok).toBe(true);

    console.log('✅ Unique content test passed:', {
      url1: result1.url,
      url2: result2.url,
      checksum1: result1.checksum.substring(0, 8),
      checksum2: result2.checksum.substring(0, 8),
    });
  });
});
