// Phase 1.3.2: Backend Processing Pipeline Types

export type LabelStyleId = 'classic' | 'modern' | 'elegant' | 'funky';

// Wine label submission - immutable record of user input
export interface WineLabelSubmission {
  id: string;
  producerName: string;
  wineName: string;
  vintage: string;
  variety: string;
  region: string;
  appellation: string;
  style: LabelStyleId;
  createdAt: Date;
  updatedAt: Date;
}

// Label generation - stateful process entity
export interface LabelGeneration {
  id: string;
  submissionId: string; // Foreign key to WineLabelSubmission
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: LabelDescription; // Only present when completed
  error?: string; // Error message if failed
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Generated label description - input for text-to-image
export interface LabelDescription {
  colorPalette: ColorPalette;
  typography: TypographySystem;
  layout: LayoutHints;
  imagery: ImageryHints;
  decorations: DecorationHints[];
  mood: MoodDescriptor;
}

export interface ColorPalette {
  primary: Color;
  secondary: Color;
  accent: Color;
  background: Color;
  temperature: 'warm' | 'cool' | 'neutral';
  contrast: 'high' | 'medium' | 'low';
}

export interface Color {
  hex: string;
  rgb: [number, number, number];
  name: string;
}

export interface TypographySystem {
  primary: Typography;
  secondary: Typography;
  hierarchy: TextHierarchy;
}

export interface Typography {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  letterSpacing: number;
  characteristics: string[]; // ["serif", "traditional", "elegant"]
}

export interface TextHierarchy {
  producerEmphasis: 'dominant' | 'balanced' | 'subtle';
  vintageProminence: 'featured' | 'standard' | 'minimal';
  regionDisplay: 'prominent' | 'integrated' | 'subtle';
}

export interface LayoutHints {
  alignment: 'centered' | 'left' | 'right' | 'asymmetric';
  composition: 'classical' | 'dynamic' | 'minimal' | 'ornate';
  whitespace: 'generous' | 'balanced' | 'compact';
  structure: 'rigid' | 'organic' | 'geometric';
}

export interface ImageryHints {
  primaryTheme: 'vineyard' | 'cellar' | 'estate' | 'abstract' | 'botanical' | 'geometric';
  elements: string[]; // ["grapevines", "rolling hills", "wine barrels"]
  style: 'photographic' | 'illustration' | 'watercolor' | 'engraving' | 'minimal' | 'art';
  complexity: 'simple' | 'moderate' | 'detailed';
}

export interface DecorationHints {
  type: 'border' | 'frame' | 'flourish' | 'pattern' | 'divider';
  theme: string; // "art-nouveau", "geometric", "vine-scroll", etc.
  placement: 'full' | 'corners' | 'top-bottom' | 'accent';
  weight: 'delicate' | 'moderate' | 'bold';
}

export interface MoodDescriptor {
  overall: string; // "sophisticated and traditional", "fresh and modern"
  attributes: string[]; // ["luxurious", "approachable", "artisanal"]
}

// QStash job types
export interface LabelGenerationJob {
  submissionId: string;
  style: LabelStyleId;
  wineData: {
    producerName: string;
    wineName: string;
    vintage: string;
    variety: string;
    region: string;
    appellation: string;
  };
}

// API Response types
export interface SubmitWineLabelResponse {
  submissionId: string;
  generationId: string;
  statusUrl: string;
  queueMessageId?: string;
}

export interface GenerationStatusResponse {
  id: string;
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: LabelDescription; // Present if completed
  error?: string; // Present if failed
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Database row types (snake_case for database compatibility)
export interface WineLabelSubmissionRow {
  id: string;
  producer_name: string;
  wine_name: string;
  vintage: string;
  variety: string;
  region: string;
  appellation: string;
  style: LabelStyleId;
  created_at: string;
  updated_at: string;
}

export interface LabelGenerationRow {
  id: string;
  submission_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: LabelDescription | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Type guards
export function isValidLabelStyle(style: string): style is LabelStyleId {
  return ['classic', 'modern', 'elegant', 'funky'].includes(style);
}

export function isTestVariety(variety: string): boolean {
  return ['TEST_ERROR', 'TEST_TIMEOUT', 'TEST_RETRY'].includes(variety);
}
