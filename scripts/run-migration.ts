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

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');

    // First, enable UUID extension
    console.log('📦 Enabling UUID extension...');
    await supabase.rpc('exec_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
    });

    // Create the wine_labels table
    console.log('🍷 Creating wine_labels table...');
    const createTableSQL = `
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
    `;

    await supabase.rpc('exec_sql', { sql: createTableSQL });

    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_wine_labels_style ON wine_labels(style);',
      'CREATE INDEX IF NOT EXISTS idx_wine_labels_region ON wine_labels(region);',
      'CREATE INDEX IF NOT EXISTS idx_wine_labels_vintage ON wine_labels(vintage);',
      'CREATE INDEX IF NOT EXISTS idx_wine_labels_created_at ON wine_labels(created_at);',
    ];

    for (const indexSQL of indexes) {
      await supabase.rpc('exec_sql', { sql: indexSQL });
    }

    // Create update trigger function
    console.log('⚡ Creating update trigger...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `,
    });

    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_wine_labels_updated_at ON wine_labels;
        CREATE TRIGGER update_wine_labels_updated_at
          BEFORE UPDATE ON wine_labels
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `,
    });

    // Insert sample data
    console.log('🎯 Inserting sample data...');
    const { error: insertError } = await supabase.from('wine_labels').insert([
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
    ]);

    if (insertError) {
      console.log('⚠️  Sample data insertion failed (table might already have data):', insertError.message);
    } else {
      console.log('✅ Sample data inserted successfully!');
    }

    // Verify the table was created
    console.log('🔍 Verifying table creation...');
    const { data, error: selectError } = await supabase.from('wine_labels').select('*').limit(5);

    if (selectError) {
      console.error('❌ Table verification failed:', selectError);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log(`📊 Found ${data?.length || 0} rows in wine_labels table`);
      if (data && data.length > 0) {
        console.log('Sample data:', data[0]);
      }
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

runMigration();
