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

export interface WineLabelSubmission {
  id: string;
  producer_name: string;
  wine_name: string;
  vintage: string;
  variety: string;
  region: string;
  appellation: string;
  style: 'classic' | 'modern' | 'elegant' | 'funky';
  created_at: string;
  updated_at: string;
}

export interface LabelGeneration {
  id: string;
  submission_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      wine_labels: {
        Row: WineLabel;
        Insert: Omit<WineLabel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WineLabel, 'id' | 'created_at' | 'updated_at'>>;
      };
      wine_label_submissions: {
        Row: WineLabelSubmission;
        Insert: Omit<WineLabelSubmission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WineLabelSubmission, 'id' | 'created_at' | 'updated_at'>>;
      };
      label_generations: {
        Row: LabelGeneration;
        Insert: Omit<LabelGeneration, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LabelGeneration, 'id' | 'created_at' | 'updated_at'>>;
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
 * Verifies that all required tables exist
 */
export async function initializeDatabase() {
  if (!supabase) {
    logger.warn('Supabase client not initialized - missing environment variables');
    return;
  }

  const requiredTables = ['wine_labels', 'wine_label_submissions', 'label_generations'];
  const missingTables: string[] = [];

  try {
    // Check each required table
    for (const tableName of requiredTables) {
      const { error } = await supabase.from(tableName).select('id').limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist
        missingTables.push(tableName);
        logger.error(`${tableName} table does not exist in the database`);
      } else if (!error) {
        logger.info(`Database connection verified - ${tableName} table exists`);
      } else {
        logger.error(`Database connection error for ${tableName}:`, error, {
          operation: 'initializeDatabase',
          tableName,
        });
      }
    }

    if (missingTables.length > 0) {
      logger.error('Missing database tables detected. Please run migrations:', {
        missingTables,
        migration_command: 'Run: supabase db push or execute migration files manually',
      });
    } else {
      logger.info('All required database tables exist');
    }
  } catch (error) {
    logger.error('Database initialization failed:', error, {
      operation: 'initializeDatabase',
    });
  }
}
