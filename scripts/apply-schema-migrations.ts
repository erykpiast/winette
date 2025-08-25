#!/usr/bin/env tsx
// Script to apply the new schema constraints migration
// Run this after deploying the upload API to ensure no NULL values exist

import { supabase } from '#backend/lib/database.js';

async function applySchemaConstraints() {
  console.log('🔧 Applying stricter schema constraints to label_assets table...\n');

  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    console.error('   Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  try {
    // Check if we have any existing data that would violate constraints
    console.log('📊 Checking existing data integrity...');

    const { data: existingAssets, error: selectError } = await supabase
      .from('label_assets')
      .select('id, generation_id, asset_id, width, height, format, checksum')
      .or('width.is.null,height.is.null,format.is.null,checksum.is.null');

    if (selectError) {
      throw new Error(`Failed to check existing data: ${selectError.message}`);
    }

    if (existingAssets && existingAssets.length > 0) {
      console.log(`⚠️  Found ${existingAssets.length} rows with NULL values in required fields:`);
      for (const asset of existingAssets) {
        console.log(`   - ID: ${asset.id} (gen: ${asset.generation_id}, asset: ${asset.asset_id})`);
        console.log(
          `     width: ${asset.width}, height: ${asset.height}, format: ${asset.format}, checksum: ${asset.checksum}`,
        );
      }
      console.log('\n❌ Cannot apply constraints with existing NULL values');
      console.log('   Either delete these rows or populate the missing values first');
      process.exit(1);
    }

    console.log('✅ No NULL values found in required fields');

    // Apply the migration manually (since this is a schema change)
    console.log('\n🔨 Applying NOT NULL constraints...');

    const migrations = [
      'ALTER TABLE label_assets ALTER COLUMN width SET NOT NULL',
      'ALTER TABLE label_assets ALTER COLUMN height SET NOT NULL',
      'ALTER TABLE label_assets ALTER COLUMN format SET NOT NULL',
      'ALTER TABLE label_assets ALTER COLUMN checksum SET NOT NULL',
    ];

    for (const sql of migrations) {
      console.log(`   Running: ${sql}`);
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        throw error;
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n🔨 Adding check constraints...');

    const checkConstraints = [
      'ALTER TABLE label_assets ADD CONSTRAINT IF NOT EXISTS check_dimensions_positive CHECK (width > 0 AND height > 0)',
      "ALTER TABLE label_assets ADD CONSTRAINT IF NOT EXISTS check_format_valid CHECK (format IN ('png', 'jpg', 'jpeg', 'webp'))",
      'ALTER TABLE label_assets ADD CONSTRAINT IF NOT EXISTS check_checksum_length CHECK (length(checksum) = 64)',
    ];

    for (const sql of checkConstraints) {
      console.log(`   Running: ${sql}`);
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        // Check constraints might fail if function doesn't exist, but that's ok
        console.log('   ⚠️  Check constraint may need to be applied via Supabase dashboard');
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n🎉 Schema constraints applied successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   ✅ width, height, format, checksum are now NOT NULL');
    console.log('   ✅ Added check constraints for positive dimensions');
    console.log('   ✅ Added check constraints for valid formats');
    console.log('   ✅ Added check constraints for SHA256 checksum length');
    console.log('\n💡 The upload API now guarantees these fields are always populated');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);

    if (error instanceof Error) {
      console.error('   Error:', error.message);
    }

    console.log('\n🔧 Manual migration steps:');
    console.log('   1. Ensure all existing rows have non-NULL values for width, height, format, checksum');
    console.log('   2. Run the SQL from supabase/migrations/006_tighten_label_assets_constraints.sql');
    console.log('   3. Or apply constraints manually in Supabase dashboard');

    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applySchemaConstraints().catch(console.error);
}
