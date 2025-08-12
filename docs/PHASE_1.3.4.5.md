# Phase 1.3.4.5: Model Steps, Prompts, and LangChain Integration

## Overview

Define the chain steps with strict input/output contracts using Zod parsers. Provide prompts and selection guidance for
models per step. Mockable adapters allow running locally without paid APIs.

## Steps & IO Contracts

1. design-scheme

- Input: submission (wine attributes), style, historical examples (few-shot)
- Output: LabelDSL core without `elements` and with `assets` references empty (only palette, typography,
  high-level composition hints)

1. image-prompts

- Input: design-scheme output
- Output: object with total expected count and prompt specs:
  - `expectedPrompts: number`
  - `prompts: Array<{ id, purpose: 'background'|'foreground'|'decoration', prompt, negativePrompt?, guidance?, aspect }>`

1. image-generate

- Input: one prompt spec
- Output: stored asset record; DSL `assets[]` appended with `{ id, url, width, height }`

1. detailed-layout

- Input: DSL with assets
- Output: DSL with `elements[]` fully populated, referencing asset ids and typed text blocks

1. render

- Input: full DSL
- Output: `preview` asset (PNG) stored and linked to generation

1. refine

- Input: submission + current DSL + rendered preview
- Output: bounded edit operations → updated DSL

## Prompting Principles

- Always restate contract and show a compact example.
- Instruct to use only allowed enums and ranges; forbid SVG or CSS.
- Keep outputs terse; no commentary; JSON only.
- On validation error, re-ask with validator feedback.

## LangChain Pseudocode

```ts
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

const layoutParser = new StructuredOutputParser.fromZodSchema(LabelDSL);

async function runDesignScheme(llm, submission) {
  const prompt = `You are a label designer... Output JSON per schema: ${layoutParser.getFormatInstructions()}`;
  const result = await llm.invoke(prompt, { input: submission });
  return layoutParser.parse(result);
}
```

## Model Choices

- Reasoning/structure: Claude 3.7 Sonnet or GPT-4.1; fallback to smaller models in dev
- Image: Replicate (Flux/SDXL) or Stability; deterministic seed support
- Vision refinement: Claude 3.7 with vision or GPT-4o-mini with vision

## Adapters

- `ImageModelAdapter`: generate(prompt) → { buffer/stream, width, height, model, seed }
- `VisionRefinerAdapter`: proposeEdits({ submission, dsl, previewUrl }) → Edit[]
- All adapters have mock implementations returning deterministic fixtures

## Retry & Guardrails

- Transient failures: exponential backoff up to 3
- Validation failures: one self-repair attempt using summarized errors
- Size/time limits: cap prompts, aspect ratios, and elements count

## Expected Output

- LangChain chains per step with StructuredOutput parsers using Zod schemas.
- Prompt templates with examples and strict instructions for enums/ranges; JSON-only outputs.
- Mock adapters for LLM and image generators to enable offline test runs.

## Testing Scenarios

- Structured parsing: valid outputs are parsed successfully; malformed outputs trigger one self-repair attempt.
- Timeouts and retries: chain respects configured timeouts; transient failures backoff and succeed on retry.
- Size limits: prompts truncated/capped as configured; elements count bounded in outputs.

## Testing Instructions

- Enable `MOCK_LLM=true` and run unit tests for each chain function with canned outputs.
- Inject malformed JSON once to verify self-repair path and that final result matches schema.
- Measure chain step latency with mocks to set baseline budgets for production.
