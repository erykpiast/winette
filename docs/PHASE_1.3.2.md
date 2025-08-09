# Phase 1.3.2: Backend Processing Pipeline & E2E Integration

## Overview

Phase 1.3.2 establishes a robust async processing pipeline for wine label generation using Upstash QStash. This phase
focuses on building the backend infrastructure with mock data generation to validate the complete processing flow,
error handling, and retry mechanisms. The pipeline creates a foundation for future phases where actual generation
logic (rule-based, then AI-powered) will be implemented.

## Objectives

1. **Async Processing Pipeline**: Establish working async job processing with mock label generation
2. **Persistent Label Database**: Store all generated labels with proper status tracking
3. **Error Handling & Retries**: Implement robust error handling with automatic retry logic
4. **LLM-Ready Architecture**: Create data structures that can feed directly into text-to-image models
5. **Pipeline Validation**: Prove the infrastructure works with comprehensive test modes

## Technical Requirements

### Core Technologies

- Node.js/TypeScript API
- PostgreSQL for label storage
- Upstash QStash for async job processing
- Vercel Functions for serverless endpoints
- Supabase for database operations

### Data Structures

```typescript
// Wine label submission - immutable record of user input
interface WineLabelSubmission {
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
interface LabelGeneration {
  id: string;
  submissionId: string; // Foreign key to WineLabelSubmission
  status: "pending" | "processing" | "completed" | "failed";
  description?: LabelDescription; // Only present when completed
  error?: string; // Error message if failed
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Generated label description - input for text-to-image
interface LabelDescription {
  colorPalette: ColorPalette;
  typography: TypographySystem;
  layout: LayoutHints;
  imagery: ImageryHints;
  decorations: DecorationHints[];
  mood: MoodDescriptor;
}

interface ColorPalette {
  primary: Color;
  secondary: Color;
  accent: Color;
  background: Color;
  temperature: "warm" | "cool" | "neutral";
  contrast: "high" | "medium" | "low";
}

interface TypographySystem {
  primary: Typography;
  secondary: Typography;
  hierarchy: TextHierarchy;
}

interface Typography {
  family: string;
  weight: number;
  style: "normal" | "italic";
  letterSpacing: number;
  characteristics: string[]; // ["serif", "traditional", "elegant"]
}

interface TextHierarchy {
  producerEmphasis: "dominant" | "balanced" | "subtle";
  vintageProminence: "featured" | "standard" | "minimal";
  regionDisplay: "prominent" | "integrated" | "subtle";
}

interface LayoutHints {
  alignment: "centered" | "left" | "right" | "asymmetric";
  composition: "classical" | "dynamic" | "minimal" | "ornate";
  whitespace: "generous" | "balanced" | "compact";
  structure: "rigid" | "organic" | "geometric";
}

interface ImageryHints {
  primaryTheme:
    | "vineyard"
    | "cellar"
    | "estate"
    | "abstract"
    | "botanical"
    | "geometric";
  elements: string[]; // ["grapevines", "rolling hills", "wine barrels"]
  style:
    | "photographic"
    | "illustration"
    | "watercolor"
    | "engraving"
    | "minimal"
    | "art";
  complexity: "simple" | "moderate" | "detailed";
}

interface DecorationHints {
  type: "border" | "frame" | "flourish" | "pattern" | "divider";
  theme: string; // "art-nouveau", "geometric", "vine-scroll", etc.
  placement: "full" | "corners" | "top-bottom" | "accent";
  weight: "delicate" | "moderate" | "bold";
}

interface MoodDescriptor {
  overall: string; // "sophisticated and traditional", "fresh and modern"
  attributes: string[]; // ["luxurious", "approachable", "artisanal"]
}
```

## Backend Infrastructure

### 1. Database Schema

- Create `wine_label_submissions` table for immutable user input
- Add `label_generations` table for generation process and results
- Foreign key relationship: generations reference submissions
- Index by style, region, variety for fast similarity queries

### 2. API Endpoints

```typescript
// Submit wine label
POST /api/wine-labels
Body: {
  producerName, wineName, vintage,
  variety, region, appellation, style
}
Response: {
  submissionId: string,
  generationId: string,
  statusUrl: string // "/api/wine-labels/generations/{id}"
}

// Check generation status
GET /api/wine-labels/generations/{id}
Response: {
  id: string,
  submissionId: string,
  status: "pending" | "processing" | "completed" | "failed",
  description?: LabelDescription, // Present if completed
  error?: string, // Present if failed
  createdAt: Date,
  updatedAt: Date
}
```

### 3. QStash Configuration

**Environment Variables:**

```bash
# Add to .env file
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your_qstash_token_here
QSTASH_CURRENT_SIGNING_KEY=your_signing_key_here
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key_here
API_BASE_URL=http://localhost:3001  # https://winette.vercel.app in production
```

**⚠️ Security Note:**

- Keep `QSTASH_TOKEN` and signing keys secret and never commit them to version control
- These keys are critical for endpoint security - anyone with these keys can execute your worker
- Rotate signing keys periodically using QStash dashboard
- Use different keys for development and production environments

**Package Installation:**

```bash
pnpm add @upstash/qstash
```

**Queue Implementation (src/backend/lib/queue.ts):**

```typescript
import { Client } from "@upstash/qstash";
import { config } from "./config.js";

export const qstash = new Client({
  token: config.QSTASH_TOKEN,
});

export interface LabelGenerationJob {
  submissionId: string;
  style: "classic" | "modern" | "elegant" | "funky";
  wineData: {
    producerName: string;
    wineName: string;
    vintage: string;
    variety: string;
    region: string;
    appellation: string;
  };
}

export async function queueLabelGeneration(job: LabelGenerationJob) {
  const response = await qstash.publishJSON({
    url: `${config.API_BASE_URL}/api/process-label`,
    body: job,
    retries: 3,
    timeout: "30s",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.messageId;
}
```

### 4. Worker Endpoint (api/process-label.ts)

```typescript
import { verifySignature } from "@upstash/qstash/nextjs";
import type { LabelGenerationJob } from "#backend/lib/queue";
import { generateLabelDescription } from "#backend/services/label-generator";
import { supabase } from "#backend/lib/database";

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const job = req.body as LabelGenerationJob;

  // Extract attempt count from QStash headers for retry testing
  const attemptCount = parseInt(req.headers["upstash-retried"] || "0") + 1;

  try {
    // Update status to processing
    await supabase
      .from("label_generations")
      .update({ status: "processing" })
      .eq("submission_id", job.submissionId);

    // Generate the label description (with attempt count for testing)
    const labelDescription = await generateLabelDescription(job, attemptCount);

    // Save results
    await supabase
      .from("label_generations")
      .update({
        status: "completed",
        description: labelDescription,
        completed_at: new Date().toISOString(),
      })
      .eq("submission_id", job.submissionId);

    return res.status(200).json({ success: true });
  } catch (error) {
    // Update status to failed
    await supabase
      .from("label_generations")
      .update({
        status: "failed",
        error: error.message,
      })
      .eq("submission_id", job.submissionId);

    // Return 500 to trigger QStash retry
    return res.status(500).json({
      error: "Processing failed",
      message: error.message,
    });
  }
};

// Wrap with QStash signature verification for security
// This ensures only QStash can execute this endpoint
export default verifySignature(handler);
```

## Label Generation (Mock Implementation)

### Mock Generation Function

```typescript
async function generateLabelDescription(
  job: LabelGenerationJob,
  attemptCount: number = 1
): Promise<LabelDescription> {
  const { style, wineData } = job;

  // Test modes for pipeline validation
  if (wineData.variety === "TEST_ERROR") {
    throw new Error("Simulated processing error");
  }
  if (wineData.variety === "TEST_TIMEOUT") {
    await new Promise((r) => setTimeout(r, 35000)); // Exceed 30s timeout
  }
  if (wineData.variety === "TEST_RETRY") {
    if (attemptCount < 3)
      throw new Error(`Retry test: attempt ${attemptCount}`);
  }

  // Return mock data for the selected style
  return getMockLabelDescription(style);
}

// Mock data generator - returns consistent test data
function getMockLabelDescription(style: LabelStyleId): LabelDescription {
  const mockDescriptions = {
    classic: createClassicMockDescription(),
    modern: createModernMockDescription(),
    elegant: createElegantMockDescription(),
    funky: createFunkyMockDescription(),
  };

  return mockDescriptions[style];
}

// Example mock description creator
function createClassicMockDescription(): LabelDescription {
  return {
    /* object matching the label description type */
  };
}
```

### Testing the Pipeline

Use these special variety values to test error handling and retries:

- `TEST_ERROR` - Triggers immediate error
- `TEST_TIMEOUT` - Causes timeout (tests QStash timeout handling)
- `TEST_RETRY` - Fails twice, succeeds on third attempt (tests retry logic)

Example test submission:

```json
{
  "producerName": "Test Winery",
  "wineName": "Pipeline Test",
  "vintage": "2024",
  "variety": "TEST_RETRY", // Will trigger retry behavior
  "region": "Test Region",
  "appellation": "Test AOC",
  "style": "modern"
}
```

Monitor the QStash dashboard to see:

- Retry attempts for `TEST_RETRY`
- Immediate failures for `TEST_ERROR`
- Timeout handling for `TEST_TIMEOUT`

## Integration Flow

### Backend Processing

```typescript
// In api/wine-labels.ts
export async function handleSubmitWineLabel(req, res) {
  // Store submission in database (immutable record)
  const { data: submission } = await supabase
    .from("wine_label_submissions")
    .insert({ ...formData })
    .select()
    .single();

  // Create new generation entity with "pending" status
  const { data: generation } = await supabase
    .from("label_generations")
    .insert({
      submission_id: submission.id,
      status: "pending",
    })
    .select()
    .single();

  // Queue generation for async processing via QStash
  const messageId = await queueLabelGeneration({
    submissionId: submission.id,
    style: submission.style,
    wineData: { ...submission },
  });

  return res.json({
    submissionId: submission.id,
    generationId: generation.id,
    statusUrl: `/api/wine-labels/generations/${generation.id}`,
    queueMessageId: messageId,
  });
}
```

**Async Processing Flow:**

- QStash receives the job and calls `/api/process-label`
- Worker endpoint updates status to "processing"
- Label description generated using business logic
- Results stored with "completed" status
- Automatic retry on failure (3 attempts)

### Data Persistence & Querying

1. **Database Operations**

   - Store all submissions with metadata
   - Index by style, region, variety for fast queries
   - Track generation success/failure rates

2. **API Testing**

   - Submission endpoint validation
   - Async processing verification
   - Query performance testing
   - Error handling scenarios

3. **Database State Verification**
   - Verify submissions table receives immutable records
   - Confirm generation status transitions: pending → processing → completed/failed
   - Test status tracking for TEST_ERROR (should show failed)
   - Test status tracking for TEST_RETRY (should show completed after retries)
   - Ensure error messages are captured for failed generations

## Backend Architecture

```text
src/backend/
├── routes/
│   ├── wine-labels.ts         // Updated endpoint
│   └── process-label.ts       // QStash worker endpoint
├── services/
│   └── label-generator.ts     // Description generation
├── lib/
│   └── queue.ts              // QStash client configuration
└── schema/
    ├── wine-label-submissions.sql  // Submissions table
    └── label-generations.sql       // Generations table
```

## Performance Considerations

1. **Async Processing with QStash**

   - **Queue-based generation system:**

     - Upstash QStash handles all queueing infrastructure
     - Serverless-first design perfect for Vercel Functions
     - Automatic scaling based on load

   - **Non-blocking form submissions:**

     - Immediate response with submission ID
     - Background processing via QStash
     - No connection timeouts or hanging requests

   - **Progress tracking:**

     - Poll generation status endpoint
     - Real-time status updates (pending → processing → completed)
     - Failed job handling with error messages

   - **Reliability features:**
     - 3 automatic retries with exponential backoff
     - 30-second timeout per processing attempt
     - Dead letter queue for permanent failures
     - Message deduplication

2. **Database Optimization**

   - Indexed queries by style/region/variety
   - Efficient similar label retrieval
   - Pagination for large result sets

3. **Frontend Performance**
   - Optimistic UI updates
   - Progressive label loading
   - Efficient polling for status

## Worker Endpoint Security

The `/api/process-label` endpoint follows a specific security model:

1. **Public Accessibility with Cryptographic Protection**

   - The endpoint must be publicly accessible via HTTP for QStash to reach it
   - Protected by cryptographic signature verification using `verifySignature(handler)`
   - Only requests with valid QStash signatures are processed

2. **Signature Verification Mechanism**

   - QStash signs every request with your `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY`
   - The `verifySignature` wrapper validates these signatures before executing the handler
   - Invalid or missing signatures result in 401 Unauthorized responses

3. **Attack Prevention**

   - **Direct calls without signature**: Rejected with 401 error
   - **Forged signatures**: Rejected as signatures won't match your keys
   - **Replay attacks**: Protected by QStash's built-in timestamp validation
   - **Only legitimate QStash requests**: Successfully processed

4. **Additional Security Layers**
   - **Rate limiting**: Leverage Vercel's built-in rate limiting
   - **Request size limits**: Prevent DoS through large payloads
   - **Monitoring**: Track unusual patterns or failed signature attempts
   - **Error handling**: Don't expose internal details in error responses

Example security flow:

```typescript
// Attacker tries: POST /api/process-label
// Result: 401 Unauthorized - Missing QStash signature

// QStash sends: POST /api/process-label with valid signature
// Result: 200 OK - Request processed successfully
```

## QStash Monitoring & Debugging

### Dashboard Access

- **URL**: <https://console.upstash.com/qstash>
- Monitor message status, retries, and failures
- View message history and payloads
- Track performance metrics

### Debugging Failed Jobs

```typescript
// Check QStash dashboard for failed messages
// Failed messages appear in the DLQ section
// Can manually retry or inspect payload

// Local debugging with curl
curl -X POST https://qstash.upstash.io/v2/publish/http://localhost:3001/api/process-label \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "test-123",
    "style": "classic",
    "wineData": { ... }
  }'
```

### Cost Optimization

- **Free Tier**: 50,000 messages/month
- **Paid**: $1 per 100,000 messages
- No charges for retries or DLQ messages
- Consider batching for high-volume scenarios

### Best Practices

1. **Idempotency**: Ensure handlers can be safely retried
2. **Logging**: Log job start/completion with submission ID
3. **Monitoring**: Set up alerts for high failure rates
4. **Timeouts**: Adjust based on generation complexity
5. **Error Messages**: Provide clear, actionable error details

## API Examples

### Submission Request/Response

```typescript
// POST /api/wine-labels
{
  "producerName": "Château Margaux",
  "wineName": "Grand Vin",
  "vintage": "2018",
  "variety": "Cabernet Sauvignon",
  "region": "Bordeaux",
  "appellation": "Margaux",
  "style": "classic"
}

// Response
{
  "submissionId": "sub_123",
  "generationId": "gen_456",
  "statusUrl": "/api/wine-labels/generations/gen_456",
  "queueMessageId": "msg_789"
}
```

### Status Check Request/Response

```typescript
// GET /api/wine-labels/generations/gen_456
{
  "id": "gen_456",
  "submissionId": "sub_123",
  "status": "completed",
  "description": { /* LabelDescription object */ },
  "createdAt": "2024-01-20T14:30:00Z",
  "updatedAt": "2024-01-20T14:30:45Z",
  "completedAt": "2024-01-20T14:30:45Z"
}

// If still processing:
{
  "id": "gen_456",
  "submissionId": "sub_123",
  "status": "processing",
  "createdAt": "2024-01-20T14:30:00Z",
  "updatedAt": "2024-01-20T14:30:15Z"
}

// If failed:
{
  "id": "gen_456",
  "submissionId": "sub_123",
  "status": "failed",
  "error": "Failed to generate description: timeout",
  "createdAt": "2024-01-20T14:30:00Z",
  "updatedAt": "2024-01-20T14:35:00Z"
}
```

## Success Criteria

1. **Pipeline Quality**

   - [ ] Mock label descriptions return valid structure
   - [ ] Consistent mock data per style
   - [ ] Error handling works correctly
   - [ ] Retry mechanism functions as expected
   - [ ] Database correctly tracks generation status
   - [ ] Test mode: TEST_ERROR variety triggers immediate failure
   - [ ] Test mode: TEST_TIMEOUT variety triggers timeout
   - [ ] Test mode: TEST_RETRY variety succeeds on third attempt

2. **API Performance**

   - [ ] Submission response < 200ms
   - [ ] Generation completion < 5 seconds (for mock data)
   - [ ] Status endpoint response < 50ms

3. **Code Quality**
   - [ ] 90%+ test coverage for API endpoints
   - [ ] API documentation complete
   - [ ] TypeScript strict mode compliance
   - [ ] Database migrations tested
   - [ ] Security measures implemented

## Timeline

**Total Duration**: 7 working days

- Days 1-2: Database schema and backend infrastructure
- Days 3-4: QStash integration and worker endpoint
- Days 5-6: Mock generation logic and test modes
- Day 7: E2E testing and monitoring setup

## Dependencies

### Prerequisites

- Phase 1.3.1: Frontend form completion
- Phase 1.1: Project setup and infrastructure
- Phase 1.2: Core input form structure

### External Dependencies

- Upstash QStash (async job processing)
- Supabase/PostgreSQL (database)
- Vercel (serverless functions)

## Future Implementation (Phase 2+)

- Replace mock data with actual rule-based generation
- Add wine knowledge integration
- Implement LLM-powered generation
- Create prompts optimized for text-to-image models

## Risks and Mitigation

1. **Risk**: QStash service availability

   - **Mitigation**: Implement fallback to direct processing for critical cases
   - **Mitigation**: Monitor QStash status page

2. **Risk**: Database connection limits

   - **Mitigation**: Use connection pooling
   - **Mitigation**: Implement proper connection cleanup

3. **Risk**: Worker timeout issues
   - **Mitigation**: Start with simple mock data
   - **Mitigation**: Optimize generation logic before adding complexity
