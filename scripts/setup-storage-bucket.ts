#!/usr/bin/env tsx
// Phase 1.3.4.3: Setup Storage Bucket Script
// Manual setup script for Supabase Storage bucket

import { supabase } from '#backend/lib/database.js';
import { initializeImageStorage } from '#backend/lib/image-storage.js';

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase Storage bucket for label images...\n');

  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    console.error('   Please ensure the following environment variables are set:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Check existing buckets
    console.log('📋 Checking existing storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    console.log('   Existing buckets:', buckets?.map((b) => b.name).join(', ') || 'none');

    // Initialize storage (creates bucket if needed)
    console.log('\n🏗️  Initializing image storage...');
    await initializeImageStorage();

    // Verify setup
    console.log('\n✅ Verifying bucket access...');
    const { error: listFilesError } = await supabase.storage.from('label-images').list('', { limit: 1 });

    if (listFilesError) {
      throw new Error(`Bucket verification failed: ${listFilesError.message}`);
    }

    console.log('   Bucket accessible ✓');

    // Test upload and download
    console.log('\n🧪 Testing upload functionality...');

    // Create a small test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01, // 1x1 dimensions
      0x08,
      0x02,
      0x00,
      0x00,
      0x00,
      0x90,
      0x77,
      0x53, // bit depth, color type, etc.
      0xde,
      0x00,
      0x00,
      0x00,
      0x0c,
      0x49,
      0x44,
      0x41, // IDAT chunk
      0x54,
      0x08,
      0x99,
      0x01,
      0x01,
      0x01,
      0x00,
      0x00, // image data
      0xfe,
      0x21,
      0xe2,
      0x84,
      0x82,
      0x00,
      0x00,
      0x00, // more image data
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60, // IEND chunk
      0x82,
    ]);

    const testPath = 'test/setup-verification.png';

    const { error: uploadError } = await supabase.storage.from('label-images').upload(testPath, testImageBuffer, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
      upsert: true,
    });

    if (uploadError) {
      throw new Error(`Upload test failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('label-images').getPublicUrl(testPath);

    console.log('   Test upload successful ✓');
    console.log('   Public URL:', urlData.publicUrl);

    // Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage.from('label-images').remove([testPath]);

    if (deleteError) {
      console.warn('   Warning: Failed to clean up test file:', deleteError.message);
    } else {
      console.log('   Test file cleaned up ✓');
    }

    // Display configuration summary
    console.log('\n📊 Storage Configuration Summary:');
    console.log('   Bucket Name: label-images');
    console.log('   Public Access: ✅ Enabled');
    console.log('   CDN: ✅ Available via Supabase');
    console.log('   Cache Headers: public, max-age=31536000, immutable');
    console.log('   File Size Limit: 50MB');
    console.log('   Allowed MIME Types: image/png, image/jpeg, image/webp');

    console.log('\n🎉 Storage bucket setup completed successfully!');
    console.log('\n📝 Manual CORS Configuration (if needed):');
    console.log('   If you encounter CORS issues, configure the following in Supabase Dashboard:');
    console.log('   - Go to Storage > Settings > CORS');
    console.log('   - Add allowed origins: http://localhost:3000, https://winette.vercel.app');
    console.log('   - Allowed methods: GET');
    console.log('   - Allowed headers: Content-Type, Authorization');
  } catch (error) {
    console.error('\n❌ Storage setup failed:', error);

    if (error instanceof Error) {
      console.error('   Error:', error.message);
    }

    console.log('\n🔧 Manual Setup Instructions:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to Storage');
    console.log('   3. Create a new bucket named "label-images"');
    console.log('   4. Set it as public');
    console.log('   5. Configure CORS settings for your domain');
    console.log('   6. Set file size limit to 50MB');
    console.log('   7. Add allowed MIME types: image/png, image/jpeg, image/webp');

    process.exit(1);
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  setupStorageBucket().catch(console.error);
}
