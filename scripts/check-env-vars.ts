#!/usr/bin/env tsx

/**
 * Environment variable diagnostic script
 * Check if required API keys are properly configured
 */

console.log('🔍 Environment Variables Check');
console.log('=============================');

const requiredVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LANGCHAIN_DEFAULT_MODEL'];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    // Show first 8 chars for security
    const masked = `${value.substring(0, 8)}...`;
    console.log(`✅ ${varName}: ${masked} (${value.length} chars)`);
  } else {
    console.log(`❌ ${varName}: Not set`);
  }
});

console.log('\n🌍 Environment Info:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`VERCEL: ${process.env.VERCEL || 'not set'}`);

// Test API key format
const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey) {
  const isValidFormat = /^sk-[A-Za-z0-9]{40,}$/.test(openaiKey);
  console.log(`\n🔑 OpenAI Key Format: ${isValidFormat ? '✅ Valid' : '❌ Invalid'}`);

  if (!isValidFormat) {
    console.log('Expected format: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  }
} else {
  console.log('\n🔑 OpenAI Key Format: ❌ Missing');
}
