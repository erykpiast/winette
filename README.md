# Winette

AI-powered wine label designer that enables winemakers to easily design professional, contextually appropriate wine
bottle labels.

## Tech Stack

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Package Manager**: pnpm 10
- **Styling**: Vanilla Extract (CSS-in-JS)
- **State Management**: TanStack Query (React Query)
- **Testing**: Vitest with Testing Library
- **Linting**: Biome
- **Storybook**: Component development and documentation
- **Observability**: NewRelic

### Backend

- **Server**: Express.js with TypeScript
- **Validation**: Zod schemas
- **API Documentation**: OpenAPI 3.0
- **Database**: Supabase (PostgreSQL)
- **Caching & Rate Limiting**: Upstash Redis
- **Observability**: NewRelic
- **Deployment**: Vercel serverless functions

### DevOps

- **CI/CD**: GitHub Actions
- **Deployment**: Vercel
- **Monitoring**: LogRocket for both frontend and backend

## Modern Browser Support

This project targets only the most recent browsers:

- Last 2 Chrome versions
- Last 2 Firefox versions
- Last 2 Safari versions
- Last 2 Edge versions

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- asdf (recommended for version management)

### Environment Setup

1. **Copy environment variables:**

   ```bash
   cp env.example .env.local
   ```

2. **Configure required services:**

   - **Supabase**: Create a project and get URL + keys
   - **Upstash**: Create a Redis database and get connection details
   - **NewRelic**: Get your license key and application ID (optional)

3. **Fill in `.env.local`:**

   ```bash
   # Frontend Configuration
   VITE_NEWRELIC_LICENSE_KEY=your_newrelic_license_key_here
   VITE_NEWRELIC_APPLICATION_ID=your_newrelic_application_id_here
   VITE_API_BASE_URL=http://localhost:3001

   # Backend Configuration
   PORT=3001
   NODE_ENV=development

   # Database Configuration (Supabase)
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Cache Configuration (Upstash)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

   # Observability Configuration (NewRelic)
   NEW_RELIC_LICENSE_KEY=your_newrelic_license_key_here
   NEW_RELIC_APP_NAME=winette-api
   NEW_RELIC_NO_CONFIG_FILE=true
   ```

### Installation & Development

```bash
# Install tools with asdf (recommended)
asdf plugin add nodejs
asdf plugin add pnpm
asdf install

# Or manually install Node.js 22+ and pnpm 10+

# Install dependencies
pnpm install

# Set up database schema (run once)
# Apply the migration in supabase/migrations/001_create_wine_labels_table.sql
# to your Supabase project

# Generate API types from OpenAPI schema
pnpm build:types

# Start full-stack development (frontend + backend)
pnpm dev

# Or start individually:
pnpm dev:frontend  # Frontend only (port 3000)
pnpm dev:backend   # Backend only (port 3001)

# Run tests
pnpm test

# Run Storybook
pnpm storybook

# Build for production
pnpm build
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_create_wine_labels_table.sql` in your Supabase SQL editor
3. This creates the `wine_labels` table with sample data

### Cache Setup

1. Create an Upstash Redis database at [upstash.com](https://upstash.com)
2. Get the REST URL and token from your dashboard
3. Add them to your environment variables

### Available Scripts

- `pnpm dev` - Start full-stack development (frontend + backend)
- `pnpm dev:frontend` - Start frontend development server only
- `pnpm dev:backend` - Start backend development server only
- `pnpm build` - Build for production (includes type generation)
- `pnpm build:types` - Generate TypeScript types from OpenAPI schema
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm test:coverage` - Run tests with coverage
- `pnpm lint` - Lint code
- `pnpm lint:fix` - Lint and fix code
- `pnpm format` - Format code
- `pnpm type-check` - Type check without emitting
- `pnpm storybook` - Start Storybook
- `pnpm build-storybook` - Build Storybook

## API Documentation

The backend provides a RESTful API documented with OpenAPI 3.0:

- **Development**: <http://localhost:3001/api/openapi.json>
- **Production**: <https://winette.vercel.app/api/openapi.json>

### Key Endpoints

- `GET /health` - Health check
- `GET /api/wine-labels` - List wine labels (with filtering & pagination)
- `GET /api/wine-labels/:id` - Get specific wine label
- `POST /api/wine-labels` - Create new wine label
- `PUT /api/wine-labels/:id` - Update wine label
- `DELETE /api/wine-labels/:id` - Delete wine label

### Features

- **Validation**: Zod schemas for request/response validation
- **Rate Limiting**: IP-based rate limiting using Redis
- **Caching**: Response caching for better performance
- **Error Handling**: Structured error responses
- **Type Safety**: Full TypeScript support with generated types

## Architecture

### Frontend Architecture

- **Component Organization**: Domain-driven structure in `src/components/`
- **Hooks**: Custom React Query hooks in `src/hooks/`
- **API Client**: Type-safe HTTP client in `src/lib/api-client.ts`
- **Types**: Auto-generated from OpenAPI schema
- **Styling**: Vanilla Extract CSS-in-JS

### Backend Architecture

- **Express Server**: `api/index.ts` with middleware
- **Routes**: Modular route handlers in `api/routes/`
- **Middleware**: Authentication, rate limiting, error handling
- **Database**: Supabase with typed client
- **Caching**: Redis for rate limiting and response caching

### Deployment

The application is deployed on Vercel with:

- **Frontend**: Static site generation
- **Backend**: Serverless functions
- **Database**: Supabase (hosted PostgreSQL)
- **Cache**: Upstash Redis
- **Monitoring**: NewRelic APM for comprehensive observability (frontend browser agent, backend APM, custom metrics,
  distributed tracing)

## Development Workflow

1. All source code lives in the `src/` directory (frontend) and `api/` directory (backend)
2. API types are auto-generated from OpenAPI schema using `pnpm build:types`
3. Database schema is managed with Supabase migrations
4. Both frontend and backend use TypeScript with strict type checking

## Environment Variables

### Frontend Environment Variables

- `VITE_NEWRELIC_LICENSE_KEY` - NewRelic browser agent license key
- `VITE_NEWRELIC_APPLICATION_ID` - NewRelic application ID
- `VITE_API_BASE_URL` - Backend API base URL

### Backend Environment variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token
- `NEW_RELIC_LICENSE_KEY` - NewRelic APM license key
- `NEW_RELIC_APP_NAME` - NewRelic application name (default: winette-api)
- `NEW_RELIC_NO_CONFIG_FILE` - Disable config file usage (default: true)

## Contributing

Please refer to the coding standards defined in `.cursorrules` for consistency.
