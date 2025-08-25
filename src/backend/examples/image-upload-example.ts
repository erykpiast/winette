#!/usr/bin/env tsx
// Example demonstrating the clean uploadImage API with centralized deduplication

import { MockImageModelAdapter, uploadImage } from '#backend/lib/image-generation.js';

async function demonstrateImageUpload() {
  console.log('📸 Image Upload API Demonstration\n');

  // Create a mock adapter and generate an image
  const adapter = new MockImageModelAdapter();

  const { data: imageBuffer, meta } = await adapter.generate({
    id: 'demo-background',
    purpose: 'background',
    prompt: 'A serene vineyard landscape at golden hour',
    aspect: '4:3',
  });

  console.log('✅ Generated image:', {
    size: `${imageBuffer.length} bytes`,
    dimensions: `${meta.width}x${meta.height}`,
    model: meta.model,
    seed: meta.seed,
  });

  // Example 1: Basic upload (deduplication handled internally)
  console.log('\n🔄 Example 1: Basic upload with internal deduplication');

  try {
    const result1 = await uploadImage({
      generationId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      assetId: 'background-asset',
      data: imageBuffer,
      prompt: 'A serene vineyard landscape at golden hour',
      model: meta.model,
      seed: meta.seed,
    });

    console.log('✅ Upload result:', {
      url: result1.url,
      dimensions: `${result1.width}x${result1.height}`,
      format: result1.format,
      checksum: `${result1.checksum.substring(0, 12)}...`,
    });

    // Example 2: Second upload of same content (should deduplicate)
    console.log('\n🔄 Example 2: Duplicate upload (should skip storage)');

    const result2 = await uploadImage({
      generationId: '550e8400-e29b-41d4-a716-446655440000', // Same UUID as first
      assetId: 'background-asset',
      data: imageBuffer,
      prompt: 'A serene vineyard landscape at golden hour',
      model: meta.model,
      seed: meta.seed,
    });

    console.log('✅ Deduplication result:', {
      url: result2.url,
      sameUrl: result1.url === result2.url,
      sameChecksum: result1.checksum === result2.checksum,
    });

    // Example 3: Using pre-computed checksum (avoids re-hashing)
    console.log('\n🔄 Example 3: Upload with pre-computed checksum');

    const crypto = await import('node:crypto');
    const precomputedChecksum = crypto.createHash('sha256').update(imageBuffer).digest('hex');

    const result3 = await uploadImage({
      generationId: '550e8400-e29b-41d4-a716-446655440001', // Different UUID
      assetId: 'optimized-asset',
      data: imageBuffer,
      checksum: precomputedChecksum, // Avoids re-hashing inside uploadImage
      prompt: 'Pre-computed checksum example',
      model: 'efficient-model',
      seed: 'seed-456',
    });

    console.log('✅ Pre-computed checksum result:', {
      url: result3.url,
      providedChecksum: `${precomputedChecksum.substring(0, 12)}...`,
      returnedChecksum: `${result3.checksum.substring(0, 12)}...`,
      matched: precomputedChecksum === result3.checksum,
    });

    // Example 4: Demonstrate global content-addressable URLs
    console.log('\n🔄 Example 4: Global content-addressable demonstration');

    const result4 = await uploadImage({
      generationId: '550e8400-e29b-41d4-a716-446655440002', // Different UUID
      assetId: 'different-asset',
      data: imageBuffer, // Same content as previous examples
      prompt: 'Different prompt, same content',
      model: 'different-model',
      seed: 'different-seed',
    });

    console.log('✅ Global content-addressable result:', {
      url: result4.url,
      sameUrlAsFirst: result1.url === result4.url, // Should be true - same content = same URL
      sameChecksum: result1.checksum === result4.checksum,
      contentAddressable: result4.url.includes('/content/'),
    });

    console.log('\n🎉 All examples completed successfully!');
    console.log('\n💡 Key benefits of content-addressable storage:');
    console.log('   • Same content = same URL globally (optimal deduplication)');
    console.log('   • Safe immutable caching (URL never changes content)');
    console.log('   • Storage efficiency (no duplicate file uploads)');
    console.log('   • Performance: pre-computed checksums avoid double hashing');
    console.log('   • Atomic metadata persistence per (generation_id, asset_id)');
    console.log('   • Content-first addressing: content/{checksum}.{ext}');
  } catch (error) {
    console.error('❌ Upload failed:', error);
    console.log('\n💡 This is expected if Supabase is not configured');
    console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to test uploads');
  }
}

// Run demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateImageUpload().catch(console.error);
}
