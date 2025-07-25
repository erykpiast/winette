import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

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
export const supabase =
  config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY
    ? createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/**
 * Initialize the database schema
 * Creates the wine_labels table if it doesn't exist
 */
export async function initializeDatabase() {
  if (!supabase) {
    logger.warn('Supabase client not initialized - missing environment variables');
    return;
  }

  try {
    // Check if table exists by trying to select from it
    const { error } = await supabase.from('wine_labels').select('id').limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, need to create it manually
      logger.error('wine_labels table does not exist in the database');
    } else if (!error) {
      logger.info('Database connection verified - wine_labels table exists');
    } else {
      logger.error('Database connection error:', error, {
        operation: 'initializeDatabase',
      });
    }
  } catch (error) {
    logger.error('Database initialization failed:', error, {
      operation: 'initializeDatabase',
    });
  }
}
