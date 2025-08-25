-- Fix checksum index for proper content-addressable storage queries
-- The current compound index (generation_id, asset_id, checksum) doesn't match our query patterns

-- Drop the incorrect compound index
DROP INDEX IF EXISTS idx_label_assets_checksum_dedup;

-- Create a simple index on checksum alone for global content lookup
-- This supports queries like: WHERE checksum = $1
CREATE INDEX idx_label_assets_checksum ON label_assets(checksum);

-- Update comments to reflect corrected indexing strategy
COMMENT ON INDEX idx_label_assets_checksum IS 
  'Supports global content-addressable lookup by checksum. Enables efficient queries for same content across different generations/assets.';

COMMENT ON TABLE label_assets IS 
  'Stores generated image assets with content-addressable URLs. The unique constraint on (generation_id, asset_id) ensures one row per asset. Simple checksum index enables global content deduplication.';

COMMENT ON COLUMN label_assets.checksum IS 
  'SHA256 hash of image content. Content-addressable storage uses content/{checksum}.{ext} paths. Index supports global content lookup.';

-- Note: The existing unique constraint on (generation_id, asset_id) efficiently handles
-- our primary query pattern: WHERE generation_id = $1 AND asset_id = $2
-- The separate checksum index supports global content queries: WHERE checksum = $1