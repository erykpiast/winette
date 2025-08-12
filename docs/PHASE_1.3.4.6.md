# Phase 1.3.4.6: Multimodal Refinement Loop

## Overview

Use a vision-capable LLM to propose bounded edits to the DSL after seeing the rendered preview along with the original
submission. Edits are constrained, validated, and applied deterministically.

## Edit Operations

```ts
type Edit =
  | { op: "move"; id: string; dx: number; dy: number }
  | { op: "resize"; id: string; dw: number; dh: number }
  | {
      op: "recolor";
      id: string;
      color: "primary" | "secondary" | "accent" | "background";
    }
  | { op: "reorder"; id: string; z: number };
```

Rules:

- Bounds remain within [0,1]; apply clamping
- Max 10 edits; max absolute delta per op = 0.2
- Only existing ids may be edited

## Prompt Sketch

- Provide submission text, DSL JSON (minified), and preview URL
- Ask for at most 5 edits that improve balance/legibility while respecting hierarchy
- Output JSON array of edits only

## Flow

1. Call VisionRefinerAdapter with inputs
2. Validate edits against schema and rules
3. Apply edits to DSL and persist; re-render
4. Single iteration for now

## Tests

- Deterministic mock returns fixed edit set; ensure edits applied correctly and clamped
- Integration: confirm preview changes geometry as expected

## Expected Output

- Edit operation schema, validation, and clamping utilities.
- Vision refiner adapter (mock + real) returning bounded edits.
- Edit application step producing updated DSL and a new rendered preview.

## Testing Scenarios

- Over-limit edits (>10) rejected; deltas over 0.2 clamped.
- Invalid ids ignored or surfaced as errors without corrupting DSL.
- Visual differences: re-rendered preview reflects applied moves/resizes/recolors.

## Testing Instructions

- Run unit tests for edit validation/clamping and application to DSL.
- With mocks, simulate a refine step and verify updated DSL and a changed preview PNG checksum.
- Optionally compute SSIM between pre/post images to ensure a meaningful change occurred.
