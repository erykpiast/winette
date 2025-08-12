# Phase 1.3.4: AI Submission Processing Chain & Renderable Label DSL

## Overview

This phase introduces a complete generation pipeline for wine labels built around a constrained, JSON Label DSL, a
retryable step-by-step orchestration, object storage/CDN for generated imagery, and a headless renderer. Each step is
independently executable, idempotent, retryable, and updates status for frontend progress.

We avoid unconstrained formats like raw SVG. The Label DSL is intentionally tight to keep models bounded while remaining
easy to render and debug.

Queueing model: Upstash QStash is used only to queue the overall generation task. The actual step orchestration runs
in-process via LangChain within a single orchestrator function.

## Objectives

- Constrained JSON Label DSL suitable for LLM generation and deterministic rendering
- QStash-queued generation task; steps orchestrated via LangChain with explicit state and retries
- Object storage/CDN for assets with persisted metadata
- Headless renderer that produces a deterministic PNG preview from the DSL
- Optional multimodal refinement loop for bounded DSL edits
- Strong validation, observability, and testability across steps

## Architecture at a glance

```text
Submission → Steps: design-scheme → image-prompts → image-generate → detailed-layout → render → refine → Complete
```

Details for each area are split into sub-documents:

- Orchestration & State: see [PHASE_1.3.4.1](./PHASE_1.3.4.1.md)
- Label DSL (schema, Zod, examples): see [PHASE_1.3.4.2](./PHASE_1.3.4.2.md)
- Image Generation & Storage (Supabase + CDN): see [PHASE_1.3.4.3](./PHASE_1.3.4.3.md)
- Headless Renderer (Puppeteer-Core + Chromium): see [PHASE_1.3.4.4](./PHASE_1.3.4.4.md)
- Model Steps & Prompts (LangChain): see [PHASE_1.3.4.5](./PHASE_1.3.4.5.md)
- Multimodal Refinement Loop: see [PHASE_1.3.4.6](./PHASE_1.3.4.6.md)
- Testing, Observability & Local Tooling: see [PHASE_1.3.4.7](./PHASE_1.3.4.7.md)

## Success criteria (high level)

- End-to-end chain runs locally with mocks; switchable to real models per env
- DSL validated at each step; renderer produces a preview image
- Steps are retryable and idempotent; failures are actionable
- Assets uploaded to CDN and referenced in DSL with metadata
- Tests cover schema validation, orchestration, and renderer geometry

## Read next

Start with orchestration/state to set up the backbone of the pipeline, then proceed to the DSL and renderer, followed by
image generation and model steps. Finish with refinement and observability:

- [PHASE_1.3.4.1 Orchestration & State Machine](./PHASE_1.3.4.1.md)
- [PHASE_1.3.4.2 Label DSL](./PHASE_1.3.4.2.md)
- [PHASE_1.3.4.3 Image Generation & Storage](./PHASE_1.3.4.3.md)
- [PHASE_1.3.4.4 Headless Renderer](./PHASE_1.3.4.4.md)
- [PHASE_1.3.4.5 Model Steps & Prompts](./PHASE_1.3.4.5.md)
- [PHASE_1.3.4.6 Multimodal Refinement](./PHASE_1.3.4.6.md)
- [PHASE_1.3.4.7 Testing & Observability](./PHASE_1.3.4.7.md)
