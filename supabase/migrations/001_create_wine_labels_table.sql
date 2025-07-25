-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create wine_labels table
CREATE TABLE IF NOT EXISTS wine_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  winery VARCHAR(100) NOT NULL,
  vintage INTEGER NOT NULL CHECK (vintage >= 1800 AND vintage <= EXTRACT(YEAR FROM NOW()) + 2),
  region VARCHAR(200) NOT NULL,
  grape_variety VARCHAR(200) NOT NULL,
  alcohol_content DECIMAL(3,1) NOT NULL CHECK (alcohol_content >= 0 AND alcohol_content <= 50),
  tasting_notes TEXT NOT NULL CHECK (LENGTH(tasting_notes) <= 1000),
  style VARCHAR(20) NOT NULL CHECK (style IN ('red', 'white', 'rosé', 'sparkling', 'dessert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wine_labels_style ON wine_labels(style);
CREATE INDEX IF NOT EXISTS idx_wine_labels_region ON wine_labels(region);
CREATE INDEX IF NOT EXISTS idx_wine_labels_vintage ON wine_labels(vintage);
CREATE INDEX IF NOT EXISTS idx_wine_labels_created_at ON wine_labels(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wine_labels_updated_at
  BEFORE UPDATE ON wine_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function for table creation (used by backend initialization)
CREATE OR REPLACE FUNCTION create_wine_labels_table()
RETURNS VOID AS $$
BEGIN
  -- This function is called by the backend if the table doesn't exist
  -- The table creation is already handled above, so this is a no-op
  -- but satisfies the backend initialization check
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO wine_labels (name, winery, vintage, region, grape_variety, alcohol_content, tasting_notes, style) VALUES
  ('Château Margaux 2015', 'Château Margaux', 2015, 'Bordeaux, France', 'Cabernet Sauvignon, Merlot', 13.5, 'Rich and complex with notes of blackcurrant, cedar, and vanilla. Elegant tannins with a long finish.', 'red'),
  ('Domaine de la Côte Pinot Noir', 'Domaine de la Côte', 2020, 'Santa Barbara County, California', 'Pinot Noir', 14.2, 'Bright red fruit flavors with earthy undertones, silky texture, and balanced acidity.', 'red'),
  ('Sancerre Les Monts Damnés', 'Henri Bourgeois', 2022, 'Loire Valley, France', 'Sauvignon Blanc', 12.8, 'Crisp and mineral-driven with citrus and herb notes, characteristic gooseberry finish.', 'white'),
  ('Dom Pérignon 2012', 'Dom Pérignon', 2012, 'Champagne, France', 'Chardonnay, Pinot Noir', 12.5, 'Exceptional vintage with fine bubbles, complex aromas of citrus, white flowers, and brioche.', 'sparkling'),
  ('Caymus Cabernet Sauvignon', 'Caymus Vineyards', 2021, 'Napa Valley, California', 'Cabernet Sauvignon', 14.8, 'Full-bodied with rich dark fruit, chocolate notes, and well-integrated oak aging.', 'red')
ON CONFLICT (id) DO NOTHING; 