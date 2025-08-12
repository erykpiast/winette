# Phase 1.3.4.7: Testing, Observability, and Local Tooling

## Testing Strategy

- Unit tests: DSL validators, step handlers (with mocks), renderer geometry
- Integration: end-to-end happy path with mocks for LLM and image model
- E2E scripts: run the full chain locally via scripts in `scripts/` with toggles for mock/real
- Golden tests: compare images using SSIM with a small threshold; avoid pixel-perfect comparisons
- Per-step DSL validation: maintain fixtures for valid and invalid examples at each step boundary

## Observability

- Structured logs per step: { generationId, step, attempt, durationMs, status }
- Error taxonomy: transient vs permanent; surfaced in `label_generation_steps.error`
- Metrics: success rate per step, median duration, retry counts

## Local Development

- `.env.local` toggles MOCK flags: `MOCK_LLM=true`, `MOCK_IMAGE_MODEL=true`, `MOCK_RENDERER=true`
- Scripts:
  - `scripts/test-pipeline.ts` enqueues a generation (via QStash) and runs the in-process orchestrator
  - `scripts/test-api-performance.ts` exercises API throughput
- Gate heavy renderer tests behind an env flag (e.g., `HEAVY_RENDER_TESTS=1`) to speed up local and CI runs

## Success Criteria

- All unit and integration tests pass locally and in CI
- Logs and step tables provide clear progress and failure insights
- Developers can run mocked pipeline offline and upgrade steps independently
- Golden tests are stable across environments due to SSIM thresholds and pinned renderer dependencies

## Expected Output

- Comprehensive unit/integration tests for DSL, steps, renderer, and adapters.
- Structured logs per step emitted and stored/visible locally; minimal metrics recorded.
- Local scripts to run the mocked pipeline end-to-end and to profile API performance.

## Testing Scenarios

- End-to-end success path using mocks: all steps complete and final preview produced.
- Failure injection: one step fails transiently and succeeds after retry; another fails permanently with clear error.
- Observability: logs include generationId, step, attempt, duration; metrics counters increment as expected.
- Renderer: golden comparisons pass under SSIM threshold; geometry assertions hold under scaling and rotation

## Testing Instructions

- Run `pnpm test` to execute unit/integration suites.
- Execute `pnpm ts-node scripts/test-pipeline.ts` with `MOCK_*` flags to run the full mocked chain; inspect DB and logs.
- Use `scripts/test-api-performance.ts` to verify latency budgets; adjust timeouts/queues as needed.
- In CI, skip heavy renderer tests by default; run them in a separate job or behind a flag. When enabled, run heavy
  tests serially with retries to minimize flakiness (e.g., configure the test runner to retry failed golden tests 1–2x).
