# Phase 1.3.4.3: Image Generation, Storage, and CDN

## Overview

This phase defines object storage and metadata persistence for generated assets, plus the image generation adapter(s).

## Storage

- Supabase Storage bucket: `label-images`
- Public CDN enabled; URLs saved to DB
- File path: `content/{checksum}.{ext}` (globally content-addressable)
  - Full SHA256 checksum ensures unique paths for different content
  - Same content gets same URL globally, enabling optimal deduplication
  - Safe `immutable` caching because URL never changes content
- Bucket access: make the bucket public. Ensure CORS allows GET from the app origin and set long-lived cache headers on
  objects (e.g., `Cache-Control: public, max-age=31536000, immutable`).
- Always return absolute URLs from the upload API (e.g., via Supabase `getPublicUrl`). Do not assume any SPA basePath.

## DB Schema (addition)

See PHASE_1.3.4.1 `label_assets` table. Notable constraints:

- `unique (generation_id, asset_id)` ensures one row per DSL asset per generation
- Simple index on `checksum` supports global content-addressable lookup
- NOT NULL constraints on width, height, format, checksum (guaranteed by upload API)

## Upload API (server-side)

```ts
export interface UploadResult {
  url: string;
  width: number;
  height: number;
  format: string;
  checksum: string;
}

export async function uploadImage({
  generationId,
  assetId,
  data,
}: {
  generationId: string;
  assetId: string;
  data: Buffer;
}): Promise<UploadResult> {
  // Pseudocode:
  // 1) Detect format (png/jpg/webp), read dimensions
  // 2) Use provided checksum or compute sha256 from buffer
  // 3) Global dedup check: if any row exists with this checksum, reuse URL and create alias record
  // 4) Upload to `content/${checksum}.${ext}` with Cache-Control headers
  // 5) Atomically upsert label_assets with url/format/width/height/checksum/prompt/model/seed
  // 6) Return absolute public URL and metadata
}
```

## Image Generation Adapter

```ts
export interface ImagePromptSpec {
  id: string;
  purpose: "background" | "foreground" | "decoration";
  prompt: string;
  negativePrompt?: string;
  guidance?: number;
  aspect: "1:1" | "4:3" | "3:2" | "2:3" | "9:16";
}

export interface GeneratedImageMeta {
  model: string;
  seed: string;
  width: number;
  height: number;
}

export interface ImageModelAdapter {
  generate(
    spec: ImagePromptSpec
  ): Promise<{ data: Buffer; meta: GeneratedImageMeta }>;
}
```

## Flow

1. For each `ImagePromptSpec`, call adapter.generate
2. Call uploadImage() with image data and metadata - content-addressable deduplication:
   - Compute checksum (unless provided)  
   - Check if (generation_id, asset_id) record exists with same checksum
   - If exists: return existing URL without re-upload
   - If new: upload to content/{checksum}.{ext} and create record
3. Update DSL `assets[]` with `{ id: assetId, url, width, height }`

Query patterns and indexing:

```sql
-- Primary query: Check existing record (uses unique constraint)
SELECT url, width, height, format, checksum
FROM label_assets
WHERE generation_id = $1 AND asset_id = $2
LIMIT 1;

-- Secondary query: Global content lookup (uses checksum index)  
SELECT url, width, height, format
FROM label_assets
WHERE checksum = $1
LIMIT 1;
```

## Testing

- Mock adapter returns deterministic image buffers (e.g., solid color PNG with embedded JSON metadata)
- Upload is stubbed in unit tests; integration test uses a test bucket

## Expected Output

- Supabase Storage bucket `label-images` created and publicly accessible with CDN URLs.
- `uploadImage` API implemented; checksums computed; public (absolute) URL, dimensions, and format returned.
- `ImageModelAdapter` interface and a mock implementation producing deterministic buffers.
- `label_assets` rows inserted on upload with prompt/model/seed metadata.
- Bucket CORS and cache headers verified; assets are cacheable and retrievable cross-origin.

## Testing Scenarios

- Happy path: generate → upload → asset row persisted; DSL assets updated with id/url/dimensions.
- Deduplication: repeated upload with same checksum short-circuits or flags duplicate appropriately.
- CDN access: fetched asset URL returns 200 with correct content-type and cache headers.
- Absolute URLs: `uploadImage` returns absolute URLs; no assumptions about SPA basePath.
- Large image handling: upload within limits; metadata extracted correctly.

## Testing Instructions

- Configure Supabase credentials and create the test bucket; run integration tests that perform real uploads (in dev).
- Run unit tests with mock adapter to verify flow without network calls.
- Manually invoke `uploadImage` in a REPL/script with a small PNG buffer and verify DB row and URL reachability.
