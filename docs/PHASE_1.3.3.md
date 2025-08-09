# Phase 1.3.3: Frontend–Backend Integration UX for Generation Flow

## Overview

When the user submits the wine details form, the form should be replaced by a summary of the submitted
parameters and a visually engaging loading experience while the backend processes the request. Processing can
take several minutes, so we must set expectations, keep the user informed, and allow graceful recovery from
failures without losing input.

This phase specifies the UX flow, components, state handling, API integration, accessibility, i18n, and testing
for that experience.

## Goals

- Replace the input form with a summary + progress view immediately after a successful submission
- Show an engaging, themed spinner and clear time expectations (minutes)
- Poll backend status until completion/failure using existing hooks
- Provide actions for cancel/reset and retry on failure, preserving submitted values
- Keep the UI accessible, localized, and easy to test

## Current Contracts (from 1.3.2)

- Submit: `POST /api/wine-labels` → `{ success, data: { submissionId, generationId, statusUrl } }`
- Status: `GET /api/wine-labels/generations/{id}` →
  `{ success, data: { id, submissionId, status: 'pending'|'processing'|'completed'|'failed', description?, error? } }`
- Existing frontend hooks:
  - `useSubmitWineLabelGeneration()` returns wrapped `{ success, data }` and error states
  - `useGenerationStatus(generationId)` polls every 2s while pending/processing
  - `useWineLabelGenerationFlow()` combines the above

## UX Flow & States

1. Idle (form visible)
2. Submitted → Show Summary + Progress
   - Optimistic: immediately replace the form with a progress view before the submit response returns
   - Status: initializing → pending/processing
   - Prominent message: “This may take a few minutes”
   - Actions: “Cancel and edit” (returns to form with values), optional “Start over”
3. Completed → Show brief result summary and “Generate another label”
4. Failed → Show error, preserve values, offer “Try again” and “Edit submission”

### Wireframe (optimistic waiting screen in place of the form)

This screen intentionally mirrors the original form layout for a smooth visual transition. Inputs are replaced by the
submitted values (no required asterisks). A semi-transparent overlay appears over the submission details area showing
the rotating grape spinner and status text. The bottom buttons remain visible and interactive.

```text
┌────────────────────────────────────────────────────────────┐
│                      Winette                               │
│             AI-Powered Wine Label Designer                 │
│                                                [Language]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│    Design Professional Wine Labels in Minutes              │
│    Enter your wine details below to get started            │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │                Create Your Wine Label                  │ │
│ │                                                        │ │
│ │  Region                                                │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ Test Region                                      │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Appellation                                           │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ Test AOC                                         │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Wine Variety                                          │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ TEST_RETRY                                       │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Producer Name                                         │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ Test Winery                                      │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Wine Name                                             │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ Pipeline Test                                    │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Vintage                                               │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ 2024                                             │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  Style                                                 │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ modern                                           │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │            [ Overlay over details ]              │  │ │
│ │  │   [ 🍇  Rotating grape cluster animation ]        │  │ │
│ │  │   Generating your label description...           │  │ │
│ │  │   This may take a few minutes.                   │  │ │
│ │  │   You can keep this tab open; we'll update       │  │ │
│ │  │   this page automatically.                       │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                        │ │
│ │        ┌─────────────────┐  ┌─────────────────┐        │ │
│ │        │ Cancel and edit │  │   Start over    │        │ │
│ │        └─────────────────┘  └─────────────────┘        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│  Status: initializing…  •  Generation ID: ua24ad-1b1ja3    │
│                                                            │
│  © 2024 Winette. Empowering winemakers with AI-assisted..  │
└────────────────────────────────────────────────────────────┘

// On completion
┌───────────────────────────────────────────────────────────────────────┐
│  ✅ Your label description is ready!                                   │
│  Style mood: “sophisticated and traditional”                          │
│  Palette: Primary + Secondary summary                                 │
│  Typography: Primary family                                           │
│                                                                       │
│  [ Generate another label ]   [ Edit previous submission ]            │
└───────────────────────────────────────────────────────────────────────┘

// On failure
┌───────────────────────────────────────────────────────────────────────┐
│  ❌ We couldn't complete your request                                  │
│  Error: <server message if available>                                 │
│                                                                       │
│  [ Try again ]   [ Edit submission ]                                  │
└───────────────────────────────────────────────────────────────────────┘
```

## Component & State Architecture

- New component: `GenerationProgress`

  - Location: `src/frontend/components/GenerationProgress/`
  - Files:
    - `GenerationProgress.tsx`
    - `GenerationProgress.css.ts`
    - `GenerationProgress.stories.tsx`
    - `GenerationProgress.test.tsx`
    - `index.ts`
  - Props:
    - `formData: WineInputFormData` (the last submitted values)
    - `submission?: { submissionId?: string; generationId?: string }` (IDs may be unknown while initializing)
    - `status?: { status: 'initializing'|'pending'|'processing'|'completed'|'failed'; description?; error? }`
    - `onCancel: () => void` (return to form with values)
    - `onRestart: () => void` (reset to empty form)
  - Behavior:
    - Shows a summary of `formData`
    - While `initializing/pending/processing`, shows fancy spinner and informational copy
    - On `completed`, shows a compact summary of the generated description
    - On `failed`, shows error message and actions
    - Accessibility: `aria-live="polite"` for status text; `aria-busy` while loading

- App-level integration (`src/frontend/components/App/AppContent.tsx`)
  - Keep the current hook: `useWineLabelGenerationFlow()`
  - Add local state: `lastSubmittedFormData: WineInputFormData | null` and `isOptimistic: boolean`
  - On form submit: set `lastSubmittedFormData`, set `isOptimistic=true`, and call `submit(data)`
  - Conditional rendering:
    - If `isOptimistic` or `submissionData` exists → render `GenerationProgress` instead of `WineInputForm`
    - Else → render `WineInputForm`
  - `onCancel` should restore the form with `lastSubmittedFormData`
  - `onRestart` should clear `lastSubmittedFormData`, set `isOptimistic=false`, and call `reset()` from the hook
  - When submit resolves successfully: set `isOptimistic=false` and pass received IDs to `GenerationProgress`
  - When submit fails: set `isOptimistic=false`, surface error, keep `lastSubmittedFormData` and return to form

## Spinner & Visual Design

- Themed, CSS-only animation to avoid JS overhead and work offline:

  - Concept: “Rotating grape cluster” → 6–8 circular dots arranged like grapes rotating slowly with a subtle pulse
  - Colors: use brand accent from design tokens; high-contrast against background
  - Animation: rotate 360° every 1.5–2s, pulse scale 0.95↔1.05 staggered per dot
  - Accessible: spinner is `aria-hidden="true"`; status text conveys the meaning and is visible

- Messaging to set expectations:
  - Primary: “Generating your label description... This may take a few minutes.”
  - Secondary: “You can keep this tab open; we’ll update this page automatically.”
  - Optional tips rotated every ~10s (localized, non-distracting)

## i18n

Add keys to `public/locales/*/translation.json`:

```json
{
  "generation": {
    "title": "Your submission",
    "initializing": "Preparing your request...",
    "processing": "Generating your label description...",
    "longRunning": "This may take a few minutes.",
    "keepTabOpen": "You can keep this tab open; we'll update this page automatically.",
    "status": "Status",
    "completedTitle": "Your label description is ready!",
    "failedTitle": "We couldn't complete your request",
    "actions": {
      "cancel": "Cancel and edit",
      "restart": "Start over",
      "retry": "Try again",
      "edit": "Edit submission",
      "another": "Generate another label"
    },
    "fields": {
      "producer": "Producer",
      "wine": "Wine",
      "vintage": "Vintage",
      "variety": "Variety",
      "region": "Region",
      "appellation": "Appellation",
      "style": "Style"
    }
  }
}
```

## Accessibility

- `aria-busy=true` on the progress container while pending/processing
- `aria-live=polite` on the human-readable status line
- Ensure focus order: after submit, move focus to progress title
- Provide visible text alternatives for all critical information

## Implementation Steps

1. Create `GenerationProgress` component with the API above and stories/tests
2. Update `AppContent`:
   - Store `lastSubmittedFormData` and `isOptimistic` in state
   - On submit, set those states and call `submit`
   - Replace the form with `GenerationProgress` immediately (optimistic), pass `status: { status: 'initializing' }`
   - When submit resolves, provide `{ submissionId, generationId }` and switch to polling state
   - Wire actions to `reset()` and state clearing/restoring
3. Keep using `useWineLabelGenerationFlow()` for submission + polling
4. Add i18n keys in `en` and `fr` (including `generation.initializing`)
5. Styling via `GenerationProgress.css.ts` using design tokens; avoid layout shifts

## Testing

- Unit: `GenerationProgress.test.tsx`
  - Renders summary, spinner while processing, completed/failed layouts
  - Buttons call `onCancel`/`onRestart`
- Integration (React Testing Library):
  - Submitting form hides form and shows progress view immediately (optimistic)
  - Status transitions: initializing → pending → processing → completed/failed
  - Submit failure while initializing returns to form with values preserved
- Scripts/e2e (optional now):
  - Use `TEST_RETRY`, `TEST_ERROR` varieties to exercise long-running and error states

## Notes & Constraints

- Polling cadence stays 2s (implemented in hook)
- Do not lose user input across state transitions (preserve `lastSubmittedFormData`)
- Avoid side-effects in render; use effects/hooks for focus and announcements
- Follow project rules: typed exports, co-located stories/tests, vanilla-extract styling
