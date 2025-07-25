import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// biome-ignore lint/complexity/useLiteralKeys: TypeScript's noPropertyAccessFromIndexSignature requires bracket notation
const supabaseUrl = process.env['SUPABASE_URL'];
// biome-ignore lint/complexity/useLiteralKeys: TypeScript's noPropertyAccessFromIndexSignature requires bracket notation
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testDatabase() {
  console.log('🔍 Testing database operations...');

  // 1. Test basic select
  console.log('\n1. Testing SELECT operation:');
  const { data: selectData, error: selectError } = await supabase.from('wine_labels').select('*').limit(1);

  console.log('   Result:', {
    dataCount: selectData?.length || 0,
    error: selectError
      ? {
          code: selectError.code,
          message: selectError.message,
          details: selectError.details,
        }
      : null,
  });

  // 2. Test insert
  console.log('\n2. Testing INSERT operation:');
  const { error: insertError } = await supabase.from('wine_labels').insert({
    name: 'Test Wine Debug',
    winery: 'Test Winery',
    vintage: 2020,
    region: 'Test Region',
    grape_variety: 'Test Grape',
    alcohol_content: 12.0,
    tasting_notes: 'Test notes for debugging',
    style: 'red',
  });

  console.log('   Result:', {
    error: insertError
      ? {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        }
      : null,
  });

  // 3. Clean up test data
  if (!insertError) {
    console.log('\n3. Cleaning up test data:');
    const { error: deleteError } = await supabase.from('wine_labels').delete().eq('name', 'Test Wine Debug');

    console.log('   Cleanup result:', {
      error: deleteError ? deleteError.message : 'Success',
    });
  }

  // 4. Final verification
  console.log('\n4. Final verification:');
  const { count, error: countError } = await supabase.from('wine_labels').select('*', { count: 'exact', head: true });

  console.log('   Count result:', {
    count,
    error: countError ? countError.message : null,
  });
}

testDatabase().catch(console.error);
