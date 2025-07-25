import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

interface Migration {
  filename: string;
  name: string;
  content: string;
}

function readMigrations(): Migration[] {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  try {
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Ensure they run in order

    return files.map((filename) => {
      const filePath = join(migrationsDir, filename);
      const content = readFileSync(filePath, 'utf8');
      const name = filename.replace('.sql', '');

      return { filename, name, content };
    });
  } catch (error) {
    console.error('❌ Could not read migrations directory:', error);
    return [];
  }
}

async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase.from('wine_labels').select('id').limit(1);
    // Check for both PostgREST and PostgreSQL error codes that indicate table doesn't exist
    return !error || (error.code !== 'PGRST116' && error.code !== '42P01');
  } catch {
    return false;
  }
}

async function insertSampleData(): Promise<boolean> {
  console.log('🎯 Inserting sample wine label data...');

  const sampleData = [
    {
      name: 'Château Margaux 2015',
      winery: 'Château Margaux',
      vintage: 2015,
      region: 'Bordeaux, France',
      grape_variety: 'Cabernet Sauvignon, Merlot',
      alcohol_content: 13.5,
      tasting_notes:
        'Rich and complex with notes of blackcurrant, cedar, and vanilla. Elegant tannins with a long finish.',
      style: 'red',
    },
    {
      name: 'Dom Pérignon 2012',
      winery: 'Dom Pérignon',
      vintage: 2012,
      region: 'Champagne, France',
      grape_variety: 'Chardonnay, Pinot Noir',
      alcohol_content: 12.5,
      tasting_notes: 'Exceptional vintage with fine bubbles, complex aromas of citrus, white flowers, and brioche.',
      style: 'sparkling',
    },
    {
      name: 'Sancerre Les Monts Damnés',
      winery: 'Henri Bourgeois',
      vintage: 2022,
      region: 'Loire Valley, France',
      grape_variety: 'Sauvignon Blanc',
      alcohol_content: 12.8,
      tasting_notes: 'Crisp and mineral-driven with citrus and herb notes, characteristic gooseberry finish.',
      style: 'white',
    },
    {
      name: 'Caymus Cabernet Sauvignon',
      winery: 'Caymus Vineyards',
      vintage: 2021,
      region: 'Napa Valley, California',
      grape_variety: 'Cabernet Sauvignon',
      alcohol_content: 14.8,
      tasting_notes: 'Full-bodied with rich dark fruit, chocolate notes, and well-integrated oak aging.',
      style: 'red',
    },
  ];

  try {
    const { error } = await supabase.from('wine_labels').insert(sampleData);

    if (error) {
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        console.log('⚠️  Sample data already exists, skipping insertion');
        return true;
      }
      console.error('❌ Failed to insert sample data:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Sample data inserted successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    return false;
  }
}

async function runMigration(migrationName?: string) {
  console.log('🚀 Wine Labels Database Migration Tool');
  console.log('=====================================\n');

  // Read available migrations
  const migrations = readMigrations();

  if (migrations.length === 0) {
    console.log('❌ No migration files found in supabase/migrations/');
    return;
  }

  // Filter for specific migration if requested
  let targetMigration = migrations[0]; // Default to first migration

  if (migrationName) {
    const found = migrations.find((m) => m.filename.includes(migrationName) || m.name.includes(migrationName));

    if (!found) {
      console.log(`❌ Migration "${migrationName}" not found`);
      console.log('\nAvailable migrations:');
      migrations.forEach((m) => console.log(`  - ${m.filename}`));
      return;
    }

    targetMigration = found;
  }

  console.log(`📁 Processing migration: ${targetMigration?.name}\n`);

  // Check if table already exists
  const tableExists = await checkTableExists();

  if (tableExists) {
    console.log('✅ wine_labels table already exists!');

    // Check if we have data
    const { data, error } = await supabase.from('wine_labels').select('*').limit(1);

    if (!error && data && data.length > 0) {
      console.log('📊 Table already has data, skipping sample data insertion');

      // Show current count
      const { count } = await supabase.from('wine_labels').select('*', { count: 'exact', head: true });
      console.log(`📈 Current wine labels count: ${count || 0}`);
    } else {
      // Table exists but no data, insert sample data
      await insertSampleData();
    }

    console.log('\n🎉 Migration completed successfully!');
    return;
  }

  // Table doesn't exist - show manual creation instructions
  console.log('❌ wine_labels table does not exist in your Supabase database');
  console.log('\n📋 MANUAL SETUP REQUIRED:');
  console.log('========================\n');

  console.log('1. Go to your Supabase Dashboard:');
  console.log(`   🔗 https://supabase.com/dashboard\n`);

  console.log('2. Select your project (winette)\n');

  console.log('3. Navigate to "SQL Editor" in the left sidebar\n');

  console.log('4. Create a new query and paste the following SQL:\n');

  // Extract and display the SQL from the migration
  console.log('──────────────────────────────────────────────');
  console.log(targetMigration?.content);
  console.log('──────────────────────────────────────────────\n');

  console.log('5. Click "Run" to execute the SQL\n');

  console.log('6. After creating the table, run this command again to add sample data:');
  console.log(`   pnpm migrate:001\n`);

  console.log('✨ Once the table is created, your API will work perfectly!');
}

// CLI interface
const args = process.argv.slice(2);
const migrationName = args[0];

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📋 Database Migration Tool

Usage:
  pnpm migrate                    # Check status and provide instructions
  pnpm migrate:001                # Run the wine_labels table migration
  pnpm tsx scripts/migrate.ts     # Same as 'pnpm migrate'
  pnpm tsx scripts/migrate.ts 001 # Run specific migration

This tool will:
1. Check if the wine_labels table exists
2. If not, provide instructions to create it manually in Supabase
3. If yes, insert sample data automatically
4. Verify everything is working

Note: Supabase API doesn't support DDL operations, so table creation 
      must be done manually through the dashboard.
  `);
  process.exit(0);
}

runMigration(migrationName);
