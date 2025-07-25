import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export interface WineLabel {
  id: string;
  name: string;
  winery: string;
  vintage: number;
  region: string;
  grape_variety: string;
  alcohol_content: number;
  tasting_notes: string;
  style: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert';
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      wine_labels: {
        Row: WineLabel;
        Insert: Omit<WineLabel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WineLabel, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Initialize the database schema
 * Creates the wine_labels table if it doesn't exist
 */
export async function initializeDatabase() {
  try {
    // Check if table exists by trying to select from it
    const { error } = await supabase.from('wine_labels').select('id').limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, need to create it manually
      console.log('❌ wine_labels table does not exist in the database');
      console.log('📋 Please create the table manually in Supabase:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to Table Editor');
      console.log('   3. Run the SQL from supabase/migrations/001_create_wine_labels_table.sql');
      console.log('   4. Or use the Supabase CLI: supabase db push');
    } else if (!error) {
      console.log('✅ Database connection verified - wine_labels table exists');
    } else {
      console.error('❌ Database connection error:', error);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}
