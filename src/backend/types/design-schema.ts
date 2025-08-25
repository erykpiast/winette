// Phase 1.3.4: Design Scheme Types and Validation
// High-level design description output from design-scheme pipeline step

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export interface DesignSchema {
  palette: DesignPalette;
  typography: DesignTypography;
  layout: LayoutHints;
  imagery: ImageryHints;
  decorations: DecorationHints[];
  mood: MoodDescriptor;
}

export interface DesignPalette {
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

export interface DesignTypography {
  primary: TypographyDefinition;
  secondary: TypographyDefinition;
  hierarchy: TextHierarchy;
}

export interface TypographyDefinition {
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

// ============================================================================
// Zod Validation Schemas (for LLM output validation)
// ============================================================================

export const ColorSchema = z.object({
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  rgb: z.tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255), z.number().int().min(0).max(255)]),
  name: z.string().min(1, 'Color name is required'),
});

export const DesignPaletteSchema = z.object({
  primary: ColorSchema,
  secondary: ColorSchema,
  accent: ColorSchema,
  background: ColorSchema,
  temperature: z.enum(['warm', 'cool', 'neutral']),
  contrast: z.enum(['high', 'medium', 'low']),
});

export const TypographyDefinitionSchema = z.object({
  family: z.string().min(1, 'Font family is required'),
  weight: z.number().int().min(100).max(900),
  style: z.enum(['normal', 'italic']),
  letterSpacing: z.number(),
  characteristics: z.array(z.string()).min(1, 'At least one characteristic required'),
});

export const TextHierarchySchema = z.object({
  producerEmphasis: z.enum(['dominant', 'balanced', 'subtle']),
  vintageProminence: z.enum(['featured', 'standard', 'minimal']),
  regionDisplay: z.enum(['prominent', 'integrated', 'subtle']),
});

export const DesignTypographySchema = z.object({
  primary: TypographyDefinitionSchema,
  secondary: TypographyDefinitionSchema,
  hierarchy: TextHierarchySchema,
});

export const LayoutHintsSchema = z.object({
  alignment: z.enum(['centered', 'left', 'right', 'asymmetric']),
  composition: z.enum(['classical', 'dynamic', 'minimal', 'ornate']),
  whitespace: z.enum(['generous', 'balanced', 'compact']),
  structure: z.enum(['rigid', 'organic', 'geometric']),
});

export const ImageryHintsSchema = z.object({
  primaryTheme: z.enum(['vineyard', 'cellar', 'estate', 'abstract', 'botanical', 'geometric']),
  elements: z.array(z.string()).min(1, 'At least one imagery element required'),
  style: z.enum(['photographic', 'illustration', 'watercolor', 'engraving', 'minimal', 'art']),
  complexity: z.enum(['simple', 'moderate', 'detailed']),
});

export const DecorationHintsSchema = z.object({
  type: z.enum(['border', 'frame', 'flourish', 'pattern', 'divider']),
  theme: z.string().min(1, 'Decoration theme is required'),
  placement: z.enum(['full', 'corners', 'top-bottom', 'accent']),
  weight: z.enum(['delicate', 'moderate', 'bold']),
});

export const MoodDescriptorSchema = z.object({
  overall: z.string().min(1, 'Overall mood description is required'),
  attributes: z.array(z.string()).min(1, 'At least one mood attribute required'),
});

export const DesignSchemaSchema = z.object({
  palette: DesignPaletteSchema,
  typography: DesignTypographySchema,
  layout: LayoutHintsSchema,
  imagery: ImageryHintsSchema,
  decorations: z.array(DecorationHintsSchema).default([]),
  mood: MoodDescriptorSchema,
});

// Type inference from schemas
export type DesignSchemaValidated = z.infer<typeof DesignSchemaSchema>;
