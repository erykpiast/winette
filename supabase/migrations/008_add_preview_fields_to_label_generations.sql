-- Add preview fields to label_generations table for storing rendered label previews
ALTER TABLE label_generations 
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS preview_width INTEGER CHECK (preview_width > 0),
ADD COLUMN IF NOT EXISTS preview_height INTEGER CHECK (preview_height > 0),
ADD COLUMN IF NOT EXISTS preview_format VARCHAR(10) CHECK (preview_format IN ('PNG', 'JPEG', 'WebP'));

-- Add index on preview_url for better query performance when filtering by preview availability
CREATE INDEX IF NOT EXISTS idx_label_generations_preview_url ON label_generations(preview_url) WHERE preview_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN label_generations.preview_url IS 'URL to the rendered wine label preview image (set when render phase completes)';
COMMENT ON COLUMN label_generations.preview_width IS 'Width of the rendered preview image in pixels';
COMMENT ON COLUMN label_generations.preview_height IS 'Height of the rendered preview image in pixels';
COMMENT ON COLUMN label_generations.preview_format IS 'Format of the rendered preview image (PNG, JPEG, or WebP)';