import { supabase } from '../src/backend/lib/database.js';

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');

  if (!supabase) {
    console.log('❌ Supabase client not available');
    return;
  }

  // Check if we can list tables (might require different permissions)
  console.log('📋 Attempting to list existing tables...');

  // Try to get table information from information_schema
  try {
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_info');

    if (tablesError) {
      console.log('❌ Could not get schema info via RPC:', tablesError.message);
    } else {
      console.log('✅ Schema info:', tables);
    }
  } catch (_error) {
    console.log('⚠️  RPC not available, trying direct queries...');
  }

  // Try to describe the wine_label_submissions table structure
  console.log('\n📊 Checking wine_label_submissions table...');
  try {
    // Try to select from the table with a LIMIT 0 to check structure
    const { error: structureError } = await supabase.from('wine_label_submissions').select('*').limit(0);

    if (structureError) {
      console.log('❌ Table structure check failed:', structureError);
    } else {
      console.log('✅ Table exists and is accessible');
    }
  } catch (error) {
    console.log('❌ Error checking table structure:', error);
  }

  // Try to check what tables exist by attempting to query different table names
  console.log('\n🔎 Testing table existence...');

  const tablesToTest = ['wine_labels', 'wine_label_submissions', 'label_generations'];

  for (const tableName of tablesToTest) {
    try {
      const { data, error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${tableName}: ${error.code} - ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: exists (count: ${data})`);
      }
    } catch (error) {
      console.log(`❌ ${tableName}: Exception - ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabaseSchema().catch((error) => {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  });
}
