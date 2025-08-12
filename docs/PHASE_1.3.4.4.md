# Phase 1.3.4.4: Headless Renderer

## Overview

Render the Label DSL into a PNG using a headless browser. No dynamic fonts initially; use system-safe stack or embed
Google fonts when allowed by license and latency constraints.

## Tech

- `puppeteer-core` + `@sparticuz/chromium` for Vercel
- Deterministic HTML template and CSS translating DSL elements
  - Pin Chromium revision and library versions to minimize rendering drift
  - Fonts: load a small, fixed set of Google Fonts (by URL) or use system stack initially

## Rendering Algorithm

1. Build HTML template with fixed `canvas.width/height` style
2. For each element in z-order:
   - text → absolutely positioned div
     - font-family from typography key or loaded web fonts (`fonts.primaryUrl|secondaryUrl`)
     - color from palette
     - apply `fontSize`, `lineHeight`, `textTransform`, and `maxLines`
   - image → img with object-fit = fit, absolute bounds; apply `rotation` transform
   - shape → divs for rect/line; stroke simulated with border; apply `rotation` transform
3. Map `dpi` to a deterministic pixel scale and snapshot:
   - Compute `scale = dpi / 96`
   - Set viewport to `widthPx = canvas.width * scale`, `heightPx = canvas.height * scale`, `deviceScaleFactor = 1`
   - Take a screenshot as PNG

## Server Function

```ts
export async function renderToPng(dsl: LabelDSL): Promise<Buffer> {
  /* ... */
}
```

## Tests

- Golden tests: small DSL fixtures render to stable PNGs (allow small SSIM delta)
- Geometry tests: per-element pixel bounds verification via DOM inspection before snapshot
- Avoid strict pixel equality; use SSIM with tolerance

## Determinism & Performance Notes

- Serverless pitfalls: cold starts and memory limits can slow down or fail renders
- Pin Chromium version and font URLs to reduce test flakiness
- Prefer a minimal font set or system fonts to keep footprint small and stable
- Consider a small concurrency limit for parallel renders to stay within memory budgets

## Expected Output

- `renderToPng(dsl)` function producing a PNG buffer from a given Label DSL deterministically.
- Serverless-compatible renderer setup with `puppeteer-core` and `@sparticuz/chromium` wired for Vercel.
- Minimal HTML/CSS template mapping DSL elements to positioned DOM nodes.

## Testing Scenarios

- Text, image, and shape elements render at expected bounds and z-order; object-fit modes obeyed for images.
- DPI scaling produces consistent sizes across deviceScaleFactors.
- Invalid bounds outside [0,1] clamped or rejected per spec; error surfaced.

## Testing Instructions

- Run unit tests: geometry inspections via `page.evaluate` prior to snapshot and SSIM-based golden comparisons.
- Execute a local script that renders a fixture DSL to `./tmp/preview.png` and visually inspect the result.
- In serverless dev, deploy function and call it with a small DSL payload; verify PNG response and timing.
