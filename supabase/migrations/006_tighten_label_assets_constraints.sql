-- Phase 1.3.4.3: Tighten label_assets schema constraints
-- The uploadImage API guarantees width, height, format, and checksum are always provided
-- Making these NOT NULL improves data integrity and prevents inconsistent states

-- Clean up any existing invalid data before adding constraints
-- 1. Remove rows with invalid checksums (not 64 character SHA256)
DELETE FROM label_assets 
WHERE checksum IS NULL 
   OR length(checksum) != 64
   OR checksum !~ '^[a-f0-9]{64}$';

-- 2. Remove rows with invalid dimensions  
DELETE FROM label_assets 
WHERE width IS NULL OR height IS NULL 
   OR width <= 0 OR height <= 0;

-- 3. Remove rows with invalid formats
DELETE FROM label_assets 
WHERE format IS NULL 
   OR format NOT IN ('png', 'jpg', 'jpeg', 'webp');

-- Add NOT NULL constraints to guaranteed fields (safe after cleanup)
ALTER TABLE label_assets 
  ALTER COLUMN width SET NOT NULL,
  ALTER COLUMN height SET NOT NULL,
  ALTER COLUMN format SET NOT NULL,
  ALTER COLUMN checksum SET NOT NULL;

-- Add check constraints for reasonable values (safe after cleanup)
ALTER TABLE label_assets 
  ADD CONSTRAINT check_dimensions_positive 
    CHECK (width > 0 AND height > 0),
  ADD CONSTRAINT check_format_valid 
    CHECK (format IN ('png', 'jpg', 'jpeg', 'webp')),
  ADD CONSTRAINT check_checksum_valid 
    CHECK (length(checksum) = 64 AND checksum ~ '^[a-f0-9]{64}$'); -- SHA256 hex string

-- Note: Index management is handled in migration 007
-- This migration focuses only on data constraints