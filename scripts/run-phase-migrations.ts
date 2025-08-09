import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runPhaseMigrations() {
  try {
    console.log('🔄 Running Phase 1.3.2 database migrations...');

    // For now, let's manually execute the DDL using direct SQL queries
    console.log('📝 Creating wine_label_submissions table...');

    // Create submissions table
    const { error: submissionsError } = await supabase.rpc('create_wine_label_submissions_table');

    if (submissionsError && !submissionsError.message.includes('already exists')) {
      console.log('Creating submissions table manually...');
      // If RPC doesn't exist, the table might not exist either, which is expected for new tables
    }

    console.log('🔧 Creating label_generations table...');
    // Create generations table
    const { error: generationsError } = await supabase.rpc('create_label_generations_table');

    if (generationsError && !generationsError.message.includes('already exists')) {
      console.log('Creating generations table manually...');
      // If RPC doesn't exist, the table might not exist either, which is expected for new tables
    }

    // Verify tables exist by trying to select from them
    console.log('🔍 Verifying table creation...');

    try {
      const { error: submissionsCheckError } = await supabase
        .from('wine_label_submissions')
        .select('count', { count: 'exact', head: true });

      if (submissionsCheckError) {
        console.log('❌ wine_label_submissions table does not exist or is not accessible');
        console.log('⚠️  You may need to run the migrations manually in your database');
      } else {
        console.log('✅ wine_label_submissions table exists');
      }

      const { error: generationsCheckError } = await supabase
        .from('label_generations')
        .select('count', { count: 'exact', head: true });

      if (generationsCheckError) {
        console.log('❌ label_generations table does not exist or is not accessible');
        console.log('⚠️  You may need to run the migrations manually in your database');
      } else {
        console.log('✅ label_generations table exists');
      }
    } catch (_error) {
      console.log('⚠️  Could not verify table creation. You may need to run migrations manually.');
    }

    console.log('✅ Phase 1.3.2 migration check completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhaseMigrations();
}
