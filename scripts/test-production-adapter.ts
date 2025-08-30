#!/usr/bin/env tsx

/**
 * Test script to verify ProductionImageModelAdapter is being used
 * and can connect to the DALL-E 3 API
 */

import { defaultImageGenerationService } from '#backend/services/image-generation-service.js';

async function testProductionAdapter() {
  console.log('🔍 Testing Production Adapter Integration');
  console.log('=====================================');

  try {
    // Check what adapter is being used
    const adapterName = defaultImageGenerationService.currentAdapter?.constructor.name;
    console.log(`📦 Current Adapter: ${adapterName}`);

    // Check environment
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`🔑 OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'present' : 'missing'}`);
    console.log(`🔑 ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'present' : 'missing'}`);

    if (adapterName === 'ProductionImageModelAdapter') {
      console.log('✅ Using ProductionImageModelAdapter');

      // Test actual image generation (this will call DALL-E 3 if keys are present)
      console.log('\n🖼️  Testing Image Generation...');

      const testSpec = {
        id: 'test-production',
        purpose: 'background' as const,
        prompt: 'Simple wine label background, elegant and minimal',
        aspect: '4:3' as const,
        negativePrompt: 'busy, cluttered',
        guidance: 7.0,
      };

      const result = await defaultImageGenerationService.currentAdapter.generate(testSpec);

      console.log(`✅ Image Generated Successfully!`);
      console.log(`   Model: ${result.meta.model}`);
      console.log(`   Size: ${result.meta.width}x${result.meta.height}`);
      console.log(`   Data Size: ${result.data.length} bytes`);
    } else if (adapterName === 'MockImageModelAdapter') {
      console.log('⚠️  Using MockImageModelAdapter');
      console.log('   This means either:');
      console.log('   - NODE_ENV is not production/staging');
      console.log('   - API keys are missing');
      console.log('   - Environment detection failed');
    } else {
      console.log(`❌ Unknown adapter: ${adapterName}`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);

      if (error.message.includes('400')) {
        console.log('\n💡 HTTP 400 Error Analysis:');
        console.log('- This confirms ProductionImageModelAdapter is being called');
        console.log('- The error is from DALL-E 3 API, not from mock adapter');
        console.log('- Check OPENAI_API_KEY format and validity');
      }
    }
  }
}

// Run the test
testProductionAdapter().catch(console.error);
