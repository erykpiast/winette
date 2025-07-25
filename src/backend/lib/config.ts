import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file for local development
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Supabase Configuration (optional for development)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Upstash Configuration (optional for development)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Rate limiting configuration
  DISABLE_RATE_LIMITING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),

  // NewRelic Configuration
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().default('winette-api'),
  NEW_RELIC_NO_CONFIG_FILE: z.string().default('true'),
});

function validateConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    // Use console methods here to avoid circular dependency with logger
    console.error('❌ Invalid environment configuration:', error);

    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }

    console.error('\n📋 Required environment variables:');
    console.error('  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    console.error('  UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN');
    console.error('  NEW_RELIC_LICENSE_KEY (optional)\n');

    // In serverless environments, don't exit the process
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript's noPropertyAccessFromIndexSignature requires bracket notation
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Environment configuration invalid');
    } else {
      process.exit(1);
    }
  }
}

export const config = validateConfig();
