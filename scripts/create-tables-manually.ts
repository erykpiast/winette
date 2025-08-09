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

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTablesManually() {
  console.log('🔧 Creating tables manually...\n');

  // Create wine_label_submissions table
  console.log('📝 Creating wine_label_submissions table...');
  const createSubmissionsTableSQL = `
    CREATE TABLE IF NOT EXISTS wine_label_submissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      producer_name VARCHAR(200) NOT NULL,
      wine_name VARCHAR(200) NOT NULL,
      vintage VARCHAR(10) NOT NULL,
      variety VARCHAR(200) NOT NULL,
      region VARCHAR(200) NOT NULL,
      appellation VARCHAR(200) NOT NULL,
      style VARCHAR(20) NOT NULL CHECK (style IN ('classic', 'modern', 'elegant', 'funky')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_style ON wine_label_submissions(style);
    CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_region ON wine_label_submissions(region);
    CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_variety ON wine_label_submissions(variety);
    CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_created_at ON wine_label_submissions(created_at);

    -- Create trigger to automatically update updated_at
    CREATE TRIGGER IF NOT EXISTS update_wine_label_submissions_updated_at
      BEFORE UPDATE ON wine_label_submissions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    const { error } = await supabase.rpc('execute_sql', { sql: createSubmissionsTableSQL });
    if (error) {
      console.log('❌ Failed to create submissions table:', error);
    } else {
      console.log('✅ Submissions table created successfully');
    }
  } catch (error) {
    console.log('❌ Exception creating submissions table:', error);
  }

  // Create label_generations table
  console.log('🔧 Creating label_generations table...');
  const createGenerationsTableSQL = `
    CREATE TABLE IF NOT EXISTS label_generations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      submission_id UUID NOT NULL REFERENCES wine_label_submissions(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      description JSONB,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_label_generations_submission_id ON label_generations(submission_id);
    CREATE INDEX IF NOT EXISTS idx_label_generations_status ON label_generations(status);
    CREATE INDEX IF NOT EXISTS idx_label_generations_created_at ON label_generations(created_at);
    CREATE INDEX IF NOT EXISTS idx_label_generations_completed_at ON label_generations(completed_at);

    -- Create trigger to automatically update updated_at
    CREATE TRIGGER IF NOT EXISTS update_label_generations_updated_at
      BEFORE UPDATE ON label_generations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    const { error } = await supabase.rpc('execute_sql', { sql: createGenerationsTableSQL });
    if (error) {
      console.log('❌ Failed to create generations table:', error);
    } else {
      console.log('✅ Generations table created successfully');
    }
  } catch (error) {
    console.log('❌ Exception creating generations table:', error);
  }

  // Test the tables
  console.log('\n🧪 Testing table operations...');

  // Test insert into submissions
  const testData = {
    producer_name: 'Test Producer',
    wine_name: 'Test Wine',
    vintage: '2024',
    variety: 'Pinot Noir',
    region: 'Test Region',
    appellation: 'Test AOC',
    style: 'classic',
  };

  const { data: submission, error: submissionError } = await supabase
    .from('wine_label_submissions')
    .insert(testData)
    .select()
    .single();

  if (submissionError) {
    console.log('❌ Test submission failed:', submissionError);
  } else {
    console.log('✅ Test submission successful:', submission.id);

    // Test generation insert
    const { data: generation, error: generationError } = await supabase
      .from('label_generations')
      .insert({
        submission_id: submission.id,
        status: 'pending',
      })
      .select()
      .single();

    if (generationError) {
      console.log('❌ Test generation failed:', generationError);
    } else {
      console.log('✅ Test generation successful:', generation.id);

      // Cleanup
      await supabase.from('label_generations').delete().eq('id', generation.id);
      await supabase.from('wine_label_submissions').delete().eq('id', submission.id);
      console.log('🧹 Cleaned up test data');
    }
  }

  console.log('\n✅ Manual table creation completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTablesManually().catch((error) => {
    console.error('❌ Manual table creation failed:', error);
    process.exit(1);
  });
}
