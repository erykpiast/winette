-- label_generation_steps: tracks each step execution per generation
CREATE TABLE IF NOT EXISTS label_generation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES label_generations(id) ON DELETE CASCADE,
  step text NOT NULL CHECK (
    step IN (
      'design-scheme', 'image-prompts', 'image-generate', 'detailed-layout', 'render', 'refine'
    )
  ),
  status text NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
  attempt int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  input jsonb,
  output jsonb,
  UNIQUE (generation_id, step)
);

-- Helpful index for queries by generation
CREATE INDEX IF NOT EXISTS idx_label_generation_steps_generation ON label_generation_steps(generation_id);



