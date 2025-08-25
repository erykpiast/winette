#!/usr/bin/env tsx

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { LabelDSLSchema } from '#backend/types/label-generation';

// Use Zod 4's native JSON Schema generation
// Note: z.toJSONSchema does not support $refStrategy option in Zod v4
// The schema is generated inline without references
const schema = z.toJSONSchema(LabelDSLSchema);

const outputPath = join(process.cwd(), 'src/backend/schema/label-dsl.json');
writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf-8');

console.log(`✅ Generated JSON Schema at ${outputPath}`);

// Also export schema as TypeScript const for easier use
const tsOutputPath = join(process.cwd(), 'src/backend/schema/label-dsl-schema.ts');
const tsContent = `// Generated from src/backend/types/label-generation.ts
// Do not edit manually

export const LabelDSLSchema = ${JSON.stringify(schema, null, 2)} as const;
`;

writeFileSync(tsOutputPath, tsContent, 'utf-8');
console.log(`✅ Generated TypeScript schema at ${tsOutputPath}`);
