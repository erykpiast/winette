import { supabase } from '../src/backend/lib/database.js';

async function testSimpleSubmission() {
  console.log('🧪 Testing simple database submission...\n');

  if (!supabase) {
    console.log('❌ Supabase client not available');
    return;
  }

  console.log('🔍 Testing database connection...');
  const { error: connectionError } = await supabase
    .from('wine_label_submissions')
    .select('count', { count: 'exact', head: true });

  if (connectionError) {
    console.log('❌ Connection failed:', connectionError);
    return;
  }
  console.log('✅ Database connected\n');

  console.log('📝 Testing submission insert...');

  const testData = {
    producer_name: 'Test Producer',
    wine_name: 'Test Wine',
    vintage: '2024',
    variety: 'Pinot Noir',
    region: 'Test Region',
    appellation: 'Test AOC',
    style: 'classic',
  };

  console.log('Inserting data:', testData);

  const { data: submission, error: submissionError } = await supabase
    .from('wine_label_submissions')
    .insert(testData)
    .select()
    .single();

  if (submissionError) {
    console.log('❌ Insert failed with full error:', submissionError);
    console.log('❌ Error code:', submissionError.code);
    console.log('❌ Error message:', submissionError.message);
    console.log('❌ Error details:', submissionError.details);
    console.log('❌ Error hint:', submissionError.hint);
    return;
  }

  console.log('✅ Insert successful!');
  console.log('📋 Created submission:', submission);

  // Cleanup
  if (submission) {
    await supabase.from('wine_label_submissions').delete().eq('id', submission.id);
    console.log('🧹 Cleaned up test data');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSimpleSubmission().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
