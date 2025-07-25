import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * PostgREST-based Migration System
 *
 * PostgREST doesn't support DDL operations directly through its API,
 * but we can use stored procedures to manage schema changes.
 */

async function createMigrationStoredProcedure() {
  console.log('🔧 Creating migration stored procedure...');

  // First, try to create a stored procedure that can execute DDL
  // This needs to be done manually in Supabase SQL Editor first
  const { data, error } = await supabase.rpc('check_migration_support');

  if (error && error.code === 'PGRST202') {
    console.log('📋 Migration stored procedure not found.');
    console.log('\nTo enable automated migrations, please run this SQL in your Supabase SQL Editor:');
    console.log('──────────────────────────────────────────────');
    console.log(`
-- Create a stored procedure for migrations
CREATE OR REPLACE FUNCTION execute_migration(migration_sql TEXT)
RETURNS TEXT AS $$
BEGIN
  EXECUTE migration_sql;
  RETURN 'Migration executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Migration failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check migration support
CREATE OR REPLACE FUNCTION check_migration_support()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Migration support enabled';
END;
$$ LANGUAGE plpgsql;

-- Create wine_labels table using the migration function
SELECT execute_migration($$
  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Create wine_labels table
  CREATE TABLE IF NOT EXISTS wine_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    winery VARCHAR(100) NOT NULL,
    vintage INTEGER NOT NULL CHECK (vintage >= 1800 AND vintage <= EXTRACT(YEAR FROM NOW()) + 2),
    region VARCHAR(200) NOT NULL,
    grape_variety VARCHAR(200) NOT NULL,
    alcohol_content DECIMAL(3,1) NOT NULL CHECK (alcohol_content >= 0 AND alcohol_content <= 50),
    tasting_notes TEXT NOT NULL CHECK (LENGTH(tasting_notes) <= 1000),
    style VARCHAR(20) NOT NULL CHECK (style IN ('red', 'white', 'rosé', 'sparkling', 'dessert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_wine_labels_style ON wine_labels(style);
  CREATE INDEX IF NOT EXISTS idx_wine_labels_region ON wine_labels(region);
  CREATE INDEX IF NOT EXISTS idx_wine_labels_vintage ON wine_labels(vintage);
  CREATE INDEX IF NOT EXISTS idx_wine_labels_created_at ON wine_labels(created_at);
  
  -- Create update trigger function
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $trigger$ language 'plpgsql';
  
  -- Create trigger
  DROP TRIGGER IF EXISTS update_wine_labels_updated_at ON wine_labels;
  CREATE TRIGGER update_wine_labels_updated_at
    BEFORE UPDATE ON wine_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
$$);
    `);
    console.log('──────────────────────────────────────────────');
    console.log('\nAfter running the above SQL, execute this script again.');
    return false;
  }

  if (!error) {
    console.log('✅ Migration support is enabled');
    return true;
  }

  console.error('❌ Error checking migration support:', error);
  return false;
}

async function executePostgRESTMigration() {
  console.log('🔄 Executing migration via PostgREST stored procedure...');

  const migrationSQL = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create wine_labels table
    CREATE TABLE IF NOT EXISTS wine_labels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      winery VARCHAR(100) NOT NULL,
      vintage INTEGER NOT NULL CHECK (vintage >= 1800 AND vintage <= EXTRACT(YEAR FROM NOW()) + 2),
      region VARCHAR(200) NOT NULL,
      grape_variety VARCHAR(200) NOT NULL,
      alcohol_content DECIMAL(3,1) NOT NULL CHECK (alcohol_content >= 0 AND alcohol_content <= 50),
      tasting_notes TEXT NOT NULL CHECK (LENGTH(tasting_notes) <= 1000),
      style VARCHAR(20) NOT NULL CHECK (style IN ('red', 'white', 'rosé', 'sparkling', 'dessert')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_wine_labels_style ON wine_labels(style);
    CREATE INDEX IF NOT EXISTS idx_wine_labels_region ON wine_labels(region);
    CREATE INDEX IF NOT EXISTS idx_wine_labels_vintage ON wine_labels(vintage);
    CREATE INDEX IF NOT EXISTS idx_wine_labels_created_at ON wine_labels(created_at);
  `;

  try {
    const { data, error } = await supabase.rpc('execute_migration', {
      migration_sql: migrationSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }

    console.log('✅ Migration result:', data);
    return true;
  } catch (error) {
    console.error('❌ Migration execution error:', error);
    return false;
  }
}

async function insertSampleDataViaPostgREST() {
  console.log('🎯 Inserting sample data via PostgREST API...');

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
  ];

  try {
    // Use PostgREST's insert functionality
    const { data, error } = await supabase.from('wine_labels').insert(sampleData).select();

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log('⚠️  Sample data already exists');
        return true;
      }
      console.error('❌ Failed to insert sample data:', error);
      return false;
    }

    console.log(`✅ Inserted ${data?.length || 0} wine labels successfully`);
    return true;
  } catch (error) {
    console.error('❌ Sample data insertion error:', error);
    return false;
  }
}

async function verifyPostgRESTAPI() {
  console.log('🔍 Verifying PostgREST API functionality...');

  try {
    // Test the PostgREST API endpoints
    const { data, error, count } = await supabase.from('wine_labels').select('*', { count: 'exact' }).limit(5);

    if (error) {
      console.error('❌ PostgREST API verification failed:', error);
      return false;
    }

    console.log(`✅ PostgREST API working: ${count} total records, ${data?.length || 0} returned`);

    // Show sample data
    if (data && data.length > 0) {
      console.log('📊 Sample wine label:', {
        name: data[0].name,
        winery: data[0].winery,
        style: data[0].style,
        vintage: data[0].vintage,
      });
    }

    return true;
  } catch (error) {
    console.error('❌ API verification error:', error);
    return false;
  }
}

async function runPostgRESTMigration() {
  console.log('🚀 PostgREST-Based Migration System');
  console.log('===================================\n');

  console.log('📖 About PostgREST:');
  console.log('PostgREST turns your PostgreSQL database into a RESTful API.');
  console.log('Supabase uses PostgREST under the hood for its API layer.');
  console.log('Reference: https://docs.postgrest.org/en/v13/\n');

  // Step 1: Check if migration support is available
  const migrationSupported = await createMigrationStoredProcedure();

  if (!migrationSupported) {
    console.log('\n🛑 Manual setup required first. Please run the SQL above.');
    return;
  }

  // Step 2: Execute the migration
  const migrationSuccess = await executePostgRESTMigration();

  if (!migrationSuccess) {
    console.log('\n❌ Migration failed. You may need to run the SQL manually.');
    return;
  }

  // Step 3: Insert sample data
  const dataInserted = await insertSampleDataViaPostgREST();

  // Step 4: Verify everything works
  const apiWorking = await verifyPostgRESTAPI();

  if (migrationSuccess && dataInserted && apiWorking) {
    console.log('\n🎉 PostgREST migration completed successfully!');
    console.log('🍷 Your wine labels API is now ready to use.');

    // Test the actual API endpoint
    console.log('\n🧪 Testing API endpoint...');
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/wine_labels?limit=3`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct PostgREST API test successful');
      console.log(`📊 Retrieved ${data.length} wine labels`);
    } else {
      console.log('⚠️  Direct API test failed, but database operations succeeded');
    }
  } else {
    console.log('\n❌ Migration partially failed. Please check the errors above.');
  }
}

// Run the migration
runPostgRESTMigration().catch(console.error);
