import { supabase } from '../src/backend/lib/database.js';

async function testExistingTables() {
  console.log('🔍 Testing existing table operations...\n');

  if (!supabase) {
    console.log('❌ Supabase client not available');
    return;
  }

  // Test the wine_labels table (which we know works)
  console.log('📋 Testing wine_labels table (should work)...');
  try {
    const { data: wineLabels, error: wineLabelsError } = await supabase.from('wine_labels').select('*').limit(1);

    if (wineLabelsError) {
      console.log('❌ wine_labels error:', wineLabelsError);
    } else {
      console.log('✅ wine_labels works! Sample record:', wineLabels[0]?.id || 'No records');
    }
  } catch (error) {
    console.log('❌ wine_labels exception:', error);
  }

  // Test the wine_label_submissions table structure
  console.log('\n📊 Testing wine_label_submissions table...');
  try {
    const { data: submissions, error: submissionsError } = await supabase
      .from('wine_label_submissions')
      .select('*')
      .limit(1);

    if (submissionsError) {
      console.log('❌ wine_label_submissions error:', JSON.stringify(submissionsError, null, 2));
    } else {
      console.log('✅ wine_label_submissions works! Records:', submissions.length);
      if (submissions.length > 0) {
        console.log('Sample record:', submissions[0]);
      }
    }
  } catch (error) {
    console.log('❌ wine_label_submissions exception:', error);
  }

  // Test the label_generations table
  console.log('\n🔧 Testing label_generations table...');
  try {
    const { data: generations, error: generationsError } = await supabase
      .from('label_generations')
      .select('*')
      .limit(1);

    if (generationsError) {
      console.log('❌ label_generations error:', JSON.stringify(generationsError, null, 2));
    } else {
      console.log('✅ label_generations works! Records:', generations.length);
      if (generations.length > 0) {
        console.log('Sample record:', generations[0]);
      }
    }
  } catch (error) {
    console.log('❌ label_generations exception:', error);
  }

  // Try a simple insert into wine_labels to test permissions
  console.log('\n📝 Testing insert permissions with wine_labels...');
  try {
    const testWineLabel = {
      name: 'Test Wine Insert',
      winery: 'Test Winery',
      vintage: 2024,
      region: 'Test Region',
      grape_variety: 'Test Variety',
      alcohol_content: 12.5,
      tasting_notes: 'Test notes',
      style: 'red',
    };

    const { data: insertedLabel, error: insertError } = await supabase
      .from('wine_labels')
      .insert(testWineLabel)
      .select()
      .single();

    if (insertError) {
      console.log('❌ wine_labels insert error:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ wine_labels insert works! ID:', insertedLabel.id);

      // Cleanup
      await supabase.from('wine_labels').delete().eq('id', insertedLabel.id);
      console.log('🧹 Cleaned up test wine label');
    }
  } catch (error) {
    console.log('❌ wine_labels insert exception:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testExistingTables().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
