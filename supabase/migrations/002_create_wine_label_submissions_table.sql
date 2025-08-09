-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the update function exists (safe to run multiple times)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create wine_label_submissions table for immutable user input
CREATE TABLE IF NOT EXISTS wine_label_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_name VARCHAR(200) NOT NULL,
  wine_name VARCHAR(200) NOT NULL,
  vintage VARCHAR(10) NOT NULL,
  variety VARCHAR(200) NOT NULL,
  region VARCHAR(200) NOT NULL,
  appellation VARCHAR(200) NOT NULL,
  style VARCHAR(20) NOT NULL CHECK (style IN ('classic', 'modern', 'elegant', 'funky')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_style ON wine_label_submissions(style);
CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_region ON wine_label_submissions(region);
CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_variety ON wine_label_submissions(variety);
CREATE INDEX IF NOT EXISTS idx_wine_label_submissions_created_at ON wine_label_submissions(created_at);

-- Create trigger to automatically update updated_at (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_wine_label_submissions_updated_at'
    ) THEN
        CREATE TRIGGER update_wine_label_submissions_updated_at
          BEFORE UPDATE ON wine_label_submissions
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;