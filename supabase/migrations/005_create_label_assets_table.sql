-- label_assets: generated image assets with metadata and CDN URL
CREATE TABLE IF NOT EXISTS label_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES label_generations(id) ON DELETE CASCADE,
  asset_id text NOT NULL, -- DSL asset id or prompt id
  prompt text,
  model text,
  seed text,
  width int,
  height int,
  format text,
  checksum text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (generation_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_label_assets_generation ON label_assets(generation_id);
CREATE INDEX IF NOT EXISTS idx_label_assets_checksum ON label_assets(checksum);



