# Local API Development

Since we've removed the Express server and now use Vercel API functions exclusively, here's how to
develop and test the API locally.

## Status

✅ **Migration Complete!** Express server removed, Vercel API functions working perfectly.

All API endpoints are fully functional:

- `pnpm test:api health GET` - ✅ Working
- `pnpm test:api openapi.json GET` - ✅ Working
- `pnpm test:api wine-labels GET` - ✅ Working (connects to database)

## Local Development

### Start Local Development Server

```bash
# Start both frontend and API together
pnpm dev

# Or start them separately
pnpm dev:frontend  # Vite dev server for frontend
pnpm dev:api       # Vercel dev server for API functions
```

This will start:

- Frontend on `http://localhost:3000` (Vite)
- API functions on `http://localhost:3001` (Vercel dev)

The frontend is configured to proxy API requests from `:3000/api/*` to `:3001/api/*`, so you can
access the API through the frontend dev server.

### API Endpoints

When running locally, your API endpoints are available at:

- `http://localhost:3001/api/health` - Health check (direct)
- `http://localhost:3001/api/wine-labels` - Wine labels CRUD (direct)
- `http://localhost:3001/api/openapi.json` - OpenAPI specification (direct)

Or through the frontend proxy at:

- `http://localhost:3000/api/health` - Health check (proxied)
- `http://localhost:3000/api/wine-labels` - Wine labels CRUD (proxied)
- `http://localhost:3000/api/openapi.json` - OpenAPI specification (proxied)

## Testing API Functions

### Using the Test Script

We provide a simple test script to verify API functions work correctly:

```bash
# Test health endpoint
pnpm test:api health GET

# Test wine labels endpoint
pnpm test:api wine-labels GET

# Test OpenAPI endpoint
pnpm test:api openapi.json GET
```

### Manual Testing with curl

```bash
# Health check (direct to API)
curl http://localhost:3001/api/health

# Get wine labels (direct to API)
curl http://localhost:3001/api/wine-labels

# Get wine labels with filters (direct to API)
curl "http://localhost:3001/api/wine-labels?style=red&limit=5"

# Get OpenAPI spec (direct to API)
curl http://localhost:3001/api/openapi.json

# Or test through the frontend proxy
curl http://localhost:3000/api/health
curl http://localhost:3000/api/wine-labels
```

## Architecture

- **API Functions**: Located in `/api/` directory, these are Vercel serverless functions
- **Business Logic**: Located in `/src/backend/routes/`, these contain the actual implementation
- **Database**: Supabase for data persistence
- **Cache**: Upstash Redis for caching (configured via environment variables)

## Environment Variables

Make sure you have these environment variables set up for local development:

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Cache (optional for local dev)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Environment
NODE_ENV=development
```

## Deployment

The API functions automatically deploy to Vercel when you push to the main branch. No separate
deployment step needed for the API.
