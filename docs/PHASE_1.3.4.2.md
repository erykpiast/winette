# Phase 1.3.4.2: Label DSL (JSON), Schema, and Rationale vs. SVG

## Rationale

SVG is too expressive for LLMs at this stage and invites brittle low-level markup. We need a constrained, readable, and
render-friendly DSL that models the label at a semantic level (palette, typography, assets, and positioned elements) and
keeps geometry simple and normalized.

## DSL Overview

```json
{
  "version": "1",
  "canvas": { "width": 800, "height": 1200, "dpi": 144, "background": "#fff" },
  "palette": {
    "primary": "#5A2A27",
    "secondary": "#C9B79C",
    "accent": "#A84C48",
    "background": "#FFFFFF",
    "temperature": "warm",
    "contrast": "medium"
  },
  "typography": {
    "primary": {
      "family": "Cinzel",
      "weight": 600,
      "style": "normal",
      "letterSpacing": 0
    },
    "secondary": {
      "family": "Lora",
      "weight": 400,
      "style": "italic",
      "letterSpacing": 0
    },
    "hierarchy": {
      "producerEmphasis": "dominant",
      "vintageProminence": "featured",
      "regionDisplay": "integrated"
    }
  },
  "fonts": {
    "primaryUrl": "https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap",
    "secondaryUrl": "https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,400&display=swap"
  },
  "assets": [
    {
      "id": "hero",
      "type": "image",
      "url": "https://cdn/.../hero.png",
      "width": 1024,
      "height": 768
    }
  ],
  "elements": [
    {
      "id": "producer",
      "type": "text",
      "text": "Château Margaux",
      "font": "primary",
      "color": "primary",
      "bounds": { "x": 0.1, "y": 0.08, "w": 0.8, "h": 0.08 },
      "align": "center",
      "fontSize": 48,
      "lineHeight": 1.2,
      "maxLines": 1,
      "textTransform": "uppercase",
      "z": 10
    },
    {
      "id": "heroImage",
      "type": "image",
      "assetId": "hero",
      "fit": "contain",
      "opacity": 1,
      "rotation": 0,
      "bounds": { "x": 0.1, "y": 0.2, "w": 0.8, "h": 0.4 },
      "z": 1
    }
  ]
}
```

Notes:

- `bounds` use normalized units [0..1] for x/y/width/height; renderer multiplies by canvas px
- `z` is layer order; lower first
- `fit` is `contain|cover|fill` for images
- `font` references `typography.primary|secondary` keys
- `canvas.background` defines the label background color; `palette.background` is a semantic token for
  elements/shapes and does not override the canvas background
- `fonts.primaryUrl|secondaryUrl` are optional web font resources (e.g., Google Fonts). If omitted, the renderer
  falls back to safe system stacks

## Types (Zod/TypeScript)

We define types under `src/backend/types/label-generation.ts` and generate JSON Schema from Zod.

```ts
import { z } from "zod";

export const Bounds = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const Canvas = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().int().positive().default(144),
  background: z.string(),
});

export const Palette = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  temperature: z.enum(["warm", "cool", "neutral"]),
  contrast: z.enum(["high", "medium", "low"]),
});

export const TypographyKey = z.enum(["primary", "secondary"]);

export const TypographyFont = z.object({
  family: z.string(),
  weight: z.number().min(100).max(900),
  style: z.enum(["normal", "italic"]),
  letterSpacing: z.number(),
});

export const TextHierarchy = z.object({
  producerEmphasis: z.enum(["dominant", "balanced", "subtle"]),
  vintageProminence: z.enum(["featured", "standard", "minimal"]),
  regionDisplay: z.enum(["prominent", "integrated", "subtle"]),
});

export const TypographySystem = z.object({
  primary: TypographyFont,
  secondary: TypographyFont,
  hierarchy: TextHierarchy,
});

export const FontResources = z.object({
  primaryUrl: z.string().url().optional(),
  secondaryUrl: z.string().url().optional(),
});

export const Asset = z.object({
  id: z.string(),
  type: z.literal("image"),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const ElementBase = z.object({
  id: z.string(),
  bounds: Bounds,
  z: z.number().int().min(0).max(1000),
});

export const TextTransform = z.enum(["uppercase", "lowercase", "none"]);

export const TextElement = ElementBase.extend({
  type: z.literal("text"),
  text: z.string(),
  font: TypographyKey,
  color: z.enum(["primary", "secondary", "accent", "background"]),
  align: z.enum(["left", "center", "right"]).default("left"),
  fontSize: z.number().int().positive(),
  lineHeight: z.number().positive().default(1.2),
  maxLines: z.number().int().min(1).max(10).default(1),
  textTransform: TextTransform.default("none"),
});

export const ImageElement = ElementBase.extend({
  type: z.literal("image"),
  assetId: z.string(),
  fit: z.enum(["contain", "cover", "fill"]).default("contain"),
  opacity: z.number().min(0).max(1).default(1),
  rotation: z.number().min(-180).max(180).default(0),
});

export const ShapeElement = ElementBase.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "line"]),
  color: z.enum(["primary", "secondary", "accent", "background"]),
  strokeWidth: z.number().min(0).max(20).default(0),
  rotation: z.number().min(-180).max(180).default(0),
});

export const Element = z.discriminatedUnion("type", [
  TextElement,
  ImageElement,
  ShapeElement,
]);

export const LabelDSL = z.object({
  version: z.literal("1"),
  canvas: Canvas,
  palette: Palette,
  typography: TypographySystem,
  fonts: FontResources.optional(),
  assets: z.array(Asset).default([]),
  elements: z.array(Element).default([]),
});

export type LabelDSL = z.infer<typeof LabelDSL>;
```

## Validation & Tooling

- Validate at every model step; return 422 with validation error summary on failure
- Provide a small CLI to validate DSL JSON files locally
- Example fixtures for snapshots in tests

## Examples

- Minimal classic, modern, elegant variants with 3–5 elements each for testing

## Expected Output

- TypeScript/Zod definitions for the Label DSL available under `src/backend/types/label-generation.ts`.
- Generated JSON Schema artifact and a small CLI validator to check JSON files against the schema.
- Example DSL fixtures (valid and invalid) in a test/fixtures directory.

## Testing Scenarios

- Valid DSL: passes Zod validation and JSON Schema validation; round-trips without mutation.
- Boundary values: normalized bounds at 0 and 1; max z values; opacity ranges; enum constraints.
- Invalid DSL: out-of-range bounds, unknown enums, missing asset references; validator returns actionable errors.

## Testing Instructions

- Run unit tests for schema validation covering valid/invalid fixtures.
- Use the CLI validator against provided fixtures and observe pass/fail output.
- Integrate with renderer unit tests to ensure types align (compile-time) and geometry is honored (runtime).
