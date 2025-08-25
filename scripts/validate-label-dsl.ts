#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LabelDSLSchema } from '#backend/types/label-generation';

// CLI usage
if (process.argv.length < 3) {
  console.error('Usage: pnpm tsx scripts/validate-label-dsl.ts <json-file>');
  process.exit(1);
}

const filePath = resolve(process.argv[2] || '');

try {
  const fileContent = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);

  // Validate with Zod
  const validationResult = LabelDSLSchema.safeParse(data);

  if (!validationResult.success) {
    console.error('❌ Validation failed:');
    validationResult.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  const result = validationResult.data;
  console.log('✅ Valid Label DSL!');
  console.log('\nParsed structure:');
  console.log(`- Version: ${result.version}`);
  console.log(`- Canvas: ${result.canvas.width}x${result.canvas.height} @ ${result.canvas.dpi}dpi`);
  console.log(`- Palette: ${result.palette.temperature} with ${result.palette.contrast} contrast`);
  console.log(`- Typography: ${result.typography.primary.family} / ${result.typography.secondary.family}`);
  console.log(`- Assets: ${result.assets.length} asset(s)`);
  console.log(`- Elements: ${result.elements.length} element(s)`);

  if (result.elements.length > 0) {
    console.log('\nElements:');
    result.elements.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.type} (id: ${el.id}, z: ${el.z})`);
    });
  }
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error('❌ Invalid JSON:', error.message);
    process.exit(1);
  }

  if (error instanceof Error && error.message.includes('ENOENT')) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.error('❌ Unexpected error:', error);
  process.exit(1);
}
