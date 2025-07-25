import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file for local development
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Supabase Configuration
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Upstash Configuration
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // NewRelic Configuration
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().default('winette-api'),
  NEW_RELIC_NO_CONFIG_FILE: z.string().default('true'),
});

function validateConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:');

    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }

    console.error('\n📋 Required environment variables:');
    console.error('  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    console.error('  UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN');
    console.error('  NEW_RELIC_LICENSE_KEY (optional)\n');

    process.exit(1);
  }
}

export const config = validateConfig();
