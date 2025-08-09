-- Create label_generations table for generation process tracking
CREATE TABLE IF NOT EXISTS label_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES wine_label_submissions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  description JSONB, -- LabelDescription object when completed
  error TEXT, -- Error message if failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_label_generations_submission_id ON label_generations(submission_id);
CREATE INDEX IF NOT EXISTS idx_label_generations_status ON label_generations(status);
CREATE INDEX IF NOT EXISTS idx_label_generations_created_at ON label_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_label_generations_completed_at ON label_generations(completed_at);

-- Create trigger to automatically update updated_at (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_label_generations_updated_at'
    ) THEN
        CREATE TRIGGER update_label_generations_updated_at
          BEFORE UPDATE ON label_generations
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;