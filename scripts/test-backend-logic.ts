import { supabase } from '../src/backend/lib/database.js';
import { generateLabelDSL } from '../src/backend/services/label-generator.js';
import type { LabelGenerationJob, LabelStyleId } from '../src/backend/types/label-generation.js';

async function testBackendLogic() {
  console.log('🧪 Testing Phase 1.3.2 Backend Logic...\n');

  // Check database connection
  console.log('🔍 Testing database connection...');
  if (!supabase) {
    console.log('❌ Supabase client not available');
    return;
  }

  const { error: dbError } = await supabase
    .from('wine_label_submissions')
    .select('count', { count: 'exact', head: true });
  if (dbError) {
    console.log(`❌ Database connection failed: ${dbError.message}`);
    return;
  }
  console.log('✅ Database connection OK\n');

  // Test 1: Normal label generation
  console.log('1️⃣ Testing normal label generation...');
  await testLabelGeneration('classic', 'Cabernet Sauvignon', 'Should complete normally');

  // Test 2: TEST_RETRY behavior
  console.log('\n2️⃣ Testing retry behavior...');
  await testRetryBehavior();

  // Test 3: TEST_ERROR behavior
  console.log('\n3️⃣ Testing error behavior...');
  await testErrorBehavior();

  // Test 4: Database operations
  console.log('\n4️⃣ Testing database operations...');
  await testDatabaseOperations();

  console.log('\n✅ Backend logic testing completed!');
}

async function testLabelGeneration(style: LabelStyleId, variety: string, description: string) {
  try {
    console.log(`   🎨 ${description}`);

    const job: LabelGenerationJob = {
      submissionId: 'test-submission-id',
      style,
      wineData: {
        producerName: 'Test Winery',
        wineName: 'Test Wine',
        vintage: '2024',
        variety,
        region: 'Test Region',
        appellation: 'Test AVA',
      },
    };

    const result = await generateLabelDSL(job, 1);
    console.log(`   ✅ Generated ${style} style description`);
    console.log(`   🎨 Version: ${result.version}`);
    console.log(`   🎨 Color palette: ${result.palette.primary} (${result.palette.temperature})`);
  } catch (error) {
    console.log(`   ❌ Generation failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function testRetryBehavior() {
  try {
    console.log('   🔄 Testing retry logic...');

    const job: LabelGenerationJob = {
      submissionId: 'test-retry-id',
      style: 'modern',
      wineData: {
        producerName: 'Retry Winery',
        wineName: 'Retry Wine',
        vintage: '2024',
        variety: 'TEST_RETRY',
        region: 'Test Region',
        appellation: 'Test AVA',
      },
    };

    // Test attempt 1 (should fail)
    try {
      await generateLabelDSL(job, 1);
      console.log('   ❌ Expected failure on attempt 1 but succeeded');
    } catch (error) {
      console.log(`   ✅ Attempt 1 failed as expected: ${error instanceof Error ? error.message : error}`);
    }

    // Test attempt 2 (should fail)
    try {
      await generateLabelDSL(job, 2);
      console.log('   ❌ Expected failure on attempt 2 but succeeded');
    } catch (error) {
      console.log(`   ✅ Attempt 2 failed as expected: ${error instanceof Error ? error.message : error}`);
    }

    // Test attempt 3 (should succeed)
    try {
      const result = await generateLabelDSL(job, 3);
      console.log('   ✅ Attempt 3 succeeded as expected');
      console.log(`   🎨 Generated DSL version: ${result.version}`);
    } catch (error) {
      console.log(`   ❌ Expected success on attempt 3 but failed: ${error instanceof Error ? error.message : error}`);
    }
  } catch (error) {
    console.log(`   ❌ Retry test error: ${error instanceof Error ? error.message : error}`);
  }
}

async function testErrorBehavior() {
  try {
    console.log('   💥 Testing error handling...');

    const job: LabelGenerationJob = {
      submissionId: 'test-error-id',
      style: 'elegant',
      wineData: {
        producerName: 'Error Winery',
        wineName: 'Error Wine',
        vintage: '2024',
        variety: 'TEST_ERROR',
        region: 'Test Region',
        appellation: 'Test AVA',
      },
    };

    try {
      await generateLabelDSL(job, 1);
      console.log('   ❌ Expected error but generation succeeded');
    } catch (error) {
      console.log(`   ✅ Error thrown as expected: ${error instanceof Error ? error.message : error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error test failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function testDatabaseOperations() {
  try {
    console.log('   💾 Testing database operations...');

    if (!supabase) {
      console.log('   ❌ Supabase client not available');
      return;
    }

    // Test submission insertion
    const testSubmission = {
      producer_name: 'Database Test Winery',
      wine_name: 'DB Test Wine',
      vintage: '2024',
      variety: 'Test Variety',
      region: 'Test Region',
      appellation: 'Test AVA',
      style: 'classic' as LabelStyleId,
    };

    const { data: submission, error: submissionError } = await supabase
      .from('wine_label_submissions')
      .insert(testSubmission)
      .select()
      .single();

    if (submissionError) {
      console.log(`   ❌ Submission insert failed: ${submissionError.message}`);
      return;
    }

    console.log(`   ✅ Created submission with ID: ${submission.id}`);

    // Test generation insertion
    const testGeneration = {
      submission_id: submission.id,
      status: 'pending' as const,
    };

    const { data: generation, error: generationError } = await supabase
      .from('label_generations')
      .insert(testGeneration)
      .select()
      .single();

    if (generationError) {
      console.log(`   ❌ Generation insert failed: ${generationError.message}`);
      return;
    }

    console.log(`   ✅ Created generation with ID: ${generation.id}`);

    // Test status updates
    const mockLabelDSL = {
      version: '1',
      canvas: {
        width: 800,
        height: 1200,
        dpi: 300,
        background: '#FFF8DC',
      },
      palette: {
        primary: '#8B0000',
        secondary: '#DAA520',
        accent: '#FFD700',
        background: '#FFF8DC',
        temperature: 'warm' as const,
        contrast: 'high' as const,
      },
      typography: {
        primary: {
          family: 'Test Font',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 1,
        },
        secondary: {
          family: 'Test Font',
          weight: 400,
          style: 'normal' as const,
          letterSpacing: 1,
        },
        hierarchy: {
          producerEmphasis: 'balanced' as const,
          vintageProminence: 'standard' as const,
          regionDisplay: 'integrated' as const,
        },
      },
      assets: [],
      elements: [],
    };

    const { error: updateError } = await supabase
      .from('label_generations')
      .update({
        status: 'completed',
        description: mockLabelDSL,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generation.id);

    if (updateError) {
      console.log(`   ❌ Generation update failed: ${updateError.message}`);
      return;
    }

    console.log('   ✅ Updated generation to completed status');

    // Test retrieval
    const { data: retrievedGeneration, error: retrievalError } = await supabase
      .from('label_generations')
      .select('*')
      .eq('id', generation.id)
      .single();

    if (retrievalError) {
      console.log(`   ❌ Generation retrieval failed: ${retrievalError.message}`);
      return;
    }

    console.log('   ✅ Retrieved generation successfully');
    console.log(`   📊 Status: ${retrievedGeneration.status}`);
    console.log(`   🎨 Has description: ${retrievedGeneration.description ? 'Yes' : 'No'}`);

    // Cleanup
    await supabase.from('label_generations').delete().eq('id', generation.id);
    await supabase.from('wine_label_submissions').delete().eq('id', submission.id);
    console.log('   🧹 Cleaned up test data');
  } catch (error) {
    console.log(`   ❌ Database test error: ${error instanceof Error ? error.message : error}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBackendLogic().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
