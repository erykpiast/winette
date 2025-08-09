import { config } from '../src/backend/lib/config.js';
import { supabase } from '../src/backend/lib/database.js';
import type { GenerationStatusResponse, SubmitWineLabelResponse } from '../src/backend/types/label-generation.js';

const API_BASE = config.API_BASE_URL || 'http://localhost:3001';

async function testPipeline() {
  console.log('🧪 Testing Phase 1.3.2 Pipeline...\n');

  // Test 1: Normal submission
  console.log('1️⃣ Testing normal submission...');
  const normalSubmission = await testSubmission({
    producerName: 'Test Winery',
    wineName: 'Pipeline Test Wine',
    vintage: '2024',
    variety: 'Pinot Noir',
    region: 'Test Valley',
    appellation: 'Test AVA',
    style: 'classic',
  });

  if (normalSubmission) {
    await pollGenerationStatus(normalSubmission.generationId, 'Normal submission');
  }

  // Test 2: TEST_RETRY variety
  console.log('\n2️⃣ Testing retry behavior...');
  const retrySubmission = await testSubmission({
    producerName: 'Retry Winery',
    wineName: 'Retry Test Wine',
    vintage: '2024',
    variety: 'TEST_RETRY',
    region: 'Test Valley',
    appellation: 'Test AVA',
    style: 'modern',
  });

  if (retrySubmission) {
    await pollGenerationStatus(retrySubmission.generationId, 'Retry test (should succeed after 3 attempts)');
  }

  // Test 3: TEST_ERROR variety
  console.log('\n3️⃣ Testing error handling...');
  const errorSubmission = await testSubmission({
    producerName: 'Error Winery',
    wineName: 'Error Test Wine',
    vintage: '2024',
    variety: 'TEST_ERROR',
    region: 'Test Valley',
    appellation: 'Test AVA',
    style: 'elegant',
  });

  if (errorSubmission) {
    await pollGenerationStatus(errorSubmission.generationId, 'Error test (should fail immediately)');
  }

  console.log('\n✅ Pipeline testing completed!');
}

interface TestSubmissionData {
  producerName: string;
  wineName: string;
  vintage: string;
  variety: string;
  region: string;
  appellation: string;
  style: string;
}

async function testSubmission(submissionData: TestSubmissionData): Promise<SubmitWineLabelResponse | null> {
  try {
    console.log(`   📤 Submitting: ${submissionData.wineName} (${submissionData.variety})`);

    const response = await fetch(`${API_BASE}/api/wine-labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log(`   ❌ Submission failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorData}`);
      return null;
    }

    const apiResponse = (await response.json()) as { success: boolean; data?: SubmitWineLabelResponse };

    if (!apiResponse.success || !apiResponse.data) {
      console.log(`   ❌ API response indicates failure`);
      return null;
    }

    const result = apiResponse.data;
    console.log(`   ✅ Submitted successfully!`);
    console.log(`   📝 Submission ID: ${result.submissionId}`);
    console.log(`   🔧 Generation ID: ${result.generationId}`);
    console.log(`   🔍 Status URL: ${result.statusUrl}`);

    return result;
  } catch (error) {
    console.log(`   ❌ Submission error: ${error}`);
    return null;
  }
}

async function pollGenerationStatus(generationId: string, testName: string) {
  console.log(`   🔄 Polling status for: ${testName}`);
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds with 1-second intervals

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_BASE}/api/wine-labels/generations/${generationId}`);

      if (!response.ok) {
        console.log(`   ❌ Status check failed: ${response.status} ${response.statusText}`);
        return;
      }

      const statusApiResponse = (await response.json()) as { success: boolean; data?: GenerationStatusResponse };

      if (!statusApiResponse.success || !statusApiResponse.data) {
        console.log(`   ❌ Status API response indicates failure`);
        return;
      }

      const status: GenerationStatusResponse = statusApiResponse.data;
      console.log(`   📊 Status: ${status.status} (attempt ${attempts + 1})`);

      if (status.status === 'completed') {
        console.log(`   ✅ Generation completed successfully!`);
        console.log(`   🎨 Description style: ${status.description?.mood?.overall || 'unknown'}`);
        return;
      } else if (status.status === 'failed') {
        console.log(`   ❌ Generation failed: ${status.error}`);
        return;
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.log(`   ❌ Status check error: ${error}`);
      return;
    }
  }

  console.log(`   ⏰ Polling timeout after ${maxAttempts} seconds`);
}

// Check if dependencies are available
async function checkDependencies() {
  console.log('🔍 Checking dependencies...');

  if (!supabase) {
    console.log('❌ Supabase client not available');
    return false;
  }

  // Test database connection
  const { error } = await supabase.from('wine_label_submissions').select('count', { count: 'exact', head: true });
  if (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    return false;
  }

  console.log('✅ Dependencies OK\n');
  return true;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDependencies().then((ok) => {
    if (ok) {
      testPipeline().catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
      });
    } else {
      console.log('❌ Dependencies check failed');
      process.exit(1);
    }
  });
}
