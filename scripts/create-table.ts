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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  try {
    console.log('🔄 Creating wine_labels table directly...');

    // Try to insert sample data to see if table exists
    const testInsert = await supabase.from('wine_labels').insert({
      name: 'Test Wine',
      winery: 'Test Winery',
      vintage: 2020,
      region: 'Test Region',
      grape_variety: 'Test Grape',
      alcohol_content: 12.0,
      tasting_notes: 'Test notes',
      style: 'red',
    });

    if (testInsert.error) {
      console.log('❌ Table does not exist. Please create it manually in Supabase.');
      console.log('📋 Instructions:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to "SQL Editor"');
      console.log('4. Create a new query and paste the following SQL:');
      console.log('');
      console.log('-- Enable UUID extension');
      console.log('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('');
      console.log('-- Create wine_labels table');
      console.log(`CREATE TABLE wine_labels (
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
);`);
      console.log('');
      console.log('-- Create indexes');
      console.log('CREATE INDEX idx_wine_labels_style ON wine_labels(style);');
      console.log('CREATE INDEX idx_wine_labels_region ON wine_labels(region);');
      console.log('CREATE INDEX idx_wine_labels_vintage ON wine_labels(vintage);');
      console.log('CREATE INDEX idx_wine_labels_created_at ON wine_labels(created_at);');
      console.log('');
      console.log('5. Run the query');
      console.log('6. Then run this script again to add sample data');
    } else {
      console.log('✅ Table exists! Adding sample data...');

      // Remove the test record
      await supabase.from('wine_labels').delete().eq('name', 'Test Wine');

      // Insert proper sample data
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

      const { error: insertError } = await supabase.from('wine_labels').insert(sampleData);

      if (insertError) {
        console.log('⚠️  Sample data might already exist:', insertError.message);
      } else {
        console.log('✅ Sample data inserted successfully!');
      }

      // Verify
      const { data } = await supabase.from('wine_labels').select('*').limit(5);
      console.log('📊 Current records:', data?.length || 0);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTable();
