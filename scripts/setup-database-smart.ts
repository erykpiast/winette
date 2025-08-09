import { supabase } from '../src/backend/lib/database.js';

async function setupDatabaseSmart() {
  console.log('🔍 Smart Database Setup\n');

  if (!supabase) {
    console.log('❌ Supabase client not available');
    return;
  }

  // Step 1: Check if we can create tables via RPC (local Supabase)
  console.log('1️⃣ Checking if we can run migrations automatically...');

  try {
    // Try to call a simple RPC to test capabilities
    const { error } = await supabase.rpc('get_schema_version');

    if (!error) {
      console.log('✅ Local Supabase detected - can run migrations automatically');
      return await runAutomaticMigrations();
    }
  } catch (_e) {
    // This is expected for managed Supabase
  }

  // Step 2: Check if tables already exist
  console.log('2️⃣ Checking existing tables...');

  const tableChecks = await Promise.all([
    checkTableExists('wine_label_submissions'),
    checkTableExists('label_generations'),
  ]);

  const [submissionsExists, generationsExists] = tableChecks;

  if (submissionsExists && generationsExists) {
    console.log('✅ All required tables exist! Database is ready.');
    return true;
  }

  // Step 3: Generate manual setup instructions
  console.log('3️⃣ Managed Supabase detected - manual setup required\n');

  if (!submissionsExists) {
    console.log('❌ wine_label_submissions table missing');
  } else {
    console.log('✅ wine_label_submissions table exists');
  }

  if (!generationsExists) {
    console.log('❌ label_generations table missing');
  } else {
    console.log('✅ label_generations table exists');
  }

  console.log('\n📋 Manual Setup Required:');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Go to SQL Editor');
  console.log('3. Run the SQL commands from: FIX_DATABASE_TABLES.md');
  console.log('4. Or use Supabase CLI: supabase db push');

  return false;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    if (!supabase) {
      return false;
    }

    const { error } = await supabase.from(tableName).select('*').limit(0);

    return !error || !error.message?.includes('does not exist');
  } catch {
    return false;
  }
}

async function runAutomaticMigrations(): Promise<boolean> {
  console.log('🔧 Running automatic migrations for local Supabase...');

  // This would only work with local Supabase that has custom RPC functions
  // For now, just indicate that manual setup is needed
  console.log('⚠️  Automatic migrations not implemented yet');
  console.log('   Use: supabase db push');

  return false;
}

// Generate detailed setup guide
function generateSetupGuide() {
  const instructions = `
🚀 Database Setup Guide

OPTION 1: Supabase CLI (Recommended)
=====================================
1. Install Supabase CLI:
   npm install -g supabase

2. Link to your project:
   supabase link --project-ref YOUR_PROJECT_REF

3. Run migrations:
   supabase db push

OPTION 2: Manual SQL (Dashboard)  
================================
1. Open: https://supabase.com/dashboard
2. Navigate to: SQL Editor
3. Copy SQL from: FIX_DATABASE_TABLES.md
4. Execute the SQL commands

OPTION 3: Local Development
===========================
1. Use local Supabase:
   supabase start

2. Run migrations locally:
   supabase db reset

Why This Happens:
- Managed Supabase restricts direct SQL execution for security
- Migration files need to be applied through official channels
- Client SDK only allows table operations, not schema changes
`;

  console.log(instructions);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabaseSmart()
    .then((success) => {
      if (!success) {
        generateSetupGuide();
        console.log('\n💡 TIP: After creating tables, test with:');
        console.log('   npx tsx scripts/test-existing-tables.ts');
      }
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}
