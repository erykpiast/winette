# Phase 1.3.4.1: Orchestration, State Machine, and Queueing

## Overview

We use Upstash QStash only to enqueue the overall generation task. A single orchestrator function runs the step-by-step
workflow in-process using LangChain, handling state transitions, retries, and fan-out where needed. Steps are modeled as
composable chain functions with strict IO contracts and Zod validation. We maintain a simple state machine with step
records to ensure observability and retry safety.

## Data Model Additions

Tables to add (Supabase/Postgres):

```sql
-- label_generation_steps: tracks each step execution
create table if not exists label_generation_steps (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references label_generations(id) on delete cascade,
  step text not null check (
    step in (
      'design-scheme', 'image-prompts', 'image-generate', 'detailed-layout', 'render', 'refine'
    )
  ),
  status text not null check (status in ('pending','processing','completed','failed')),
  attempt int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  input jsonb,
  output jsonb,
  unique (generation_id, step)
);

-- label_assets: every generated image with metadata and CDN URL
create table if not exists label_assets (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references label_generations(id) on delete cascade,
  asset_id text not null, -- DSL asset id
  prompt text,
  model text,
  seed text,
  width int,
  height int,
  format text,
  checksum text,
  url text not null,
  created_at timestamptz not null default now(),
  unique (generation_id, asset_id)
);

create index if not exists idx_label_assets_generation on label_assets(generation_id);
create index if not exists idx_label_assets_checksum on label_assets(checksum);
```

Environment variables:

```bash
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=label-images
API_BASE_URL=https://winette.vercel.app
```

## State Machine

```text
pending → processing → completed | failed

Steps (strict order):
1. design-scheme
2. image-prompts
3. image-generate (fan-out per prompt, join)
4. detailed-layout
5. render
6. refine (optional; max 1 iteration initially)
```

Rules:

- Each step writes `label_generation_steps` with input/output and status
- Retries increment `attempt` and overwrite `output`/`error`; idempotent handlers detect duplicates by `generation_id`
- Fan-out image generation uses a derived message group id; joins when all assets present or timeout reached

## Queueing Contract (Single Task)

Publish a single message (JSON body) to QStash to kick off orchestration. Include a deduplication header to reduce
duplicates at the queue level:

Headers:

```text
Upstash-Deduplication-Id: <generationId>
```

Body:

```json
{
  "generationId": "uuid",
  "idempotencyKey": "genId:attempt"
}
```

The QStash callback invokes one Vercel Function `POST /api/process-label` that verifies the signature and then runs
the in-process orchestrator. There are no per-step webhooks.

## Endpoints (Vercel Functions)

- `POST /api/process-label` — QStash target; runs the orchestrator for a `generationId` in-process.

Shared utilities provide DB, logging, and state persistence. Step execution happens in-process, not via separate HTTP
handlers.

## Idempotency & Retries

- Idempotency via `(generation_id, step)` uniqueness and step status guards
- Safe to retry: orchestrator re-uses existing data if present, otherwise computes
- Non-deterministic calls (image gen) store checksum and short-circuit if asset exists

### Concurrency safety (step execution)

Before processing any step, consult the `label_generation_steps` row for `(generation_id, step)`:

- If `status = 'completed'`: reuse existing `output` and skip execution
- If `status = 'processing'` and the row is stale (e.g., `updated_at` older than timeout): apply a steal-or-skip policy
- Otherwise, atomically transition to `processing` only if the row is currently `pending` or `failed`:

```sql
UPDATE label_generation_steps
SET status = 'processing', attempt = attempt + 1, started_at = now()
WHERE generation_id = $1 AND step = $2 AND status IN ('pending','failed')
RETURNING *;
```

If the `RETURNING` yields no row, another worker has claimed the step; re-check or wait.

## Success Criteria

- Step rows created with accurate timestamps and attempts
- Retry on transient errors; permanent failures reported with actionable messages
- Fan-out image generation completes join and advances

## Expected Output

- DB migrations for `label_generation_steps` and `label_assets` applied in Supabase.
- One QStash-secured Vercel Function (`/api/process-label`) that executes all steps in-process.
- Step state transitions working: pending → processing → completed/failed with attempt increments and timestamps.

## Fan-out/Join details for image generation

- The `image-prompts` step output includes both the list of prompt specs and the total expected count (source of truth).
- The orchestrator fans out image generation per prompt id (concurrently with a small limit). Each successful upload
  inserts one row into `label_assets` with `(generation_id, asset_id = prompt.id)` (uniqueness enforced per generation).
- Join condition: advance only when the number of ready assets equals `expectedPrompts`, or a timeout elapses. No
  separate prompts table is required initially.

Example readiness query:

```sql
-- $1 = generation_id, $2 = text[] of expected asset_ids
SELECT COUNT(*) AS ready
FROM label_assets
WHERE generation_id = $1
  AND asset_id = ANY($2);
```

## Testing Scenarios

- Happy path: end-to-end step progression for a single generation, all steps complete once.
- Retry path: simulate transient failure in one step, ensure attempt++ and eventual success.
- Fan-out/join: multiple image prompts generate assets; join advances only when all are present.
- Idempotency: re-submit the same step payload; handler should no-op or reuse prior output safely.

## Testing Instructions

- Set `.env.local` with QStash keys and Supabase service role; enable mocks for model-dependent steps.
- Use `scripts/test-pipeline.ts` to enqueue a generation and observe rows in `label_generation_steps` changing.
- Manually invoke `/api/generations/run` with a valid QStash signature (or bypass in dev) to run the full chain once.
- Query Supabase to verify attempts and timestamps; ensure errors are captured on failed runs.
