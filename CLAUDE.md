# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Winette is an AI-powered wine label designer built with React 19 and TypeScript. The application enables winemakers
to design professional wine bottle labels using a modern full-stack architecture with frontend-backend separation.

## Development Commands

### Essential Commands

```bash
# Install dependencies
pnpm install

# Start full-stack development (both frontend and backend)
pnpm dev

# Build for production
pnpm build

# Generate API types from OpenAPI schema (run after backend changes)
pnpm build:types

# Run tests
pnpm test
pnpm test:ui

# Code quality checks
pnpm lint
pnpm type-check

# Component development
pnpm storybook
```

### Individual Services

```bash
# Frontend only (port 3000)
pnpm dev:frontend

# Backend only (port 3001)
pnpm dev:api
```

### Specialized Commands

```bash
# Fix linting issues
pnpm lint:code:fix
pnpm format:code

# Type checking by environment
pnpm type-check:frontend
pnpm type-check:backend
pnpm type-check:scripts

# Performance testing
pnpm test:performance
```

## Architecture Overview

### Tech Stack

- **Frontend**: React 19 with TypeScript, Vite 7, Vanilla Extract CSS-in-JS
- **Backend**: Vercel serverless functions with TypeScript, Express.js patterns
- **Database**: Supabase (PostgreSQL)
- **Caching**: Upstash Redis for rate limiting and response caching
- **State Management**: TanStack Query (React Query)
- **Testing**: Vitest with Testing Library
- **Linting**: Biome (strict configuration)
- **Observability**: NewRelic for frontend and backend monitoring

### Project Structure

```text
src/
├── frontend/              # React application
│   ├── components/        # Domain-driven component organization
│   │   └── App/          # Main app components with co-located files
│   ├── hooks/            # Custom React Query hooks
│   ├── lib/              # Frontend utilities (API client, error reporting)
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Vanilla Extract styles
├── backend/              # Backend route handlers and utilities
│   ├── routes/           # API route implementations
│   ├── lib/              # Backend utilities (database, cache, logger)
│   └── schema/           # OpenAPI schema definitions
api/                      # Vercel serverless function exports
scripts/                  # Build and utility scripts
docs/                     # Project documentation
```

### TypeScript Configuration Architecture

The project uses a sophisticated TypeScript setup with project references:

- **`tsconfig.paths.json`**: Single source of truth for all path mappings
- **`tsconfig.frontend.json`**: Frontend-specific config with DOM types
- **`tsconfig.backend.json`**: Backend-specific config with Node types
- **`tsconfig.scripts.json`**: Configuration for build scripts

All configurations inherit path mappings from `tsconfig.paths.json`, enabling consistent
`#backend/*`, `#components/*`, etc. imports across the codebase.

## Code Standards and Patterns

### Key Principles from .cursorrules

1. **Explicit Contracts**: All exported functions/components must have explicit typing, unit tests, and
   Storybook stories
2. **Composition Over Configuration**: Prefer small, focused functions over large configurable ones
3. **Domain-Driven Structure**: Organize by feature/domain, not technical role
4. **Error Boundaries**: Use React Error Boundaries for component error isolation
5. **Type Safety**: Leverage TypeScript strict mode with branded types for domain IDs

### Import Patterns

- Use path mappings: `#components/*`, `#types/*`, `#hooks/*`, `#lib/*`, `#backend/*`
- Group imports: external, internal (#-prefixed), relative
- Use `import type` for TypeScript types
- Prefer named exports over default exports

### Component Architecture

- Function components with hooks
- Custom hooks for complex state logic
- Co-locate related files (Component.tsx, Component.css.ts, Component.test.tsx, Component.stories.tsx)
- Use React Query for server state management

### Backend Patterns

- Serverless functions in `api/` directory export from `src/backend/routes/`
- All API routes include rate limiting, caching, and error handling
- Zod schemas for request/response validation
- Comprehensive logging and monitoring with NewRelic

## Development Workflow

### Environment Setup

1. Copy `env.example` to `.env.local`
2. Configure Supabase (database) and Upstash (Redis) credentials
3. Run database migration from `supabase/migrations/`
4. Generate API types: `pnpm build:types`

### Code Quality Checks

Before committing, ensure all checks pass:

```bash
pnpm lint        # Biome linting
pnpm type-check  # TypeScript compilation
pnpm test        # Unit tests
```

The project uses lint-staged with Husky for pre-commit hooks that automatically run these checks.

### API Development

- API endpoints are defined in `src/backend/routes/` and exported via `api/`
- OpenAPI schema in `src/backend/schema/openapi.json` drives type generation
- All routes include comprehensive error handling and monitoring
- Rate limiting and caching are implemented via Redis

### Testing Strategy

- Unit tests with Vitest and Testing Library
- Component testing focuses on user behavior, not implementation details
- API testing includes performance and rate limiting validation
- Storybook for component development and visual testing

## Key Files and Locations

### Configuration

- `biome.json`: Linting and formatting configuration
- `vite.config.ts`: Frontend build configuration with Vanilla Extract
- `vercel.json`: Deployment configuration
- `.cursorrules`: Comprehensive coding standards

### Critical Paths

- `src/frontend/components/App/App.tsx`: Main application entry with error boundaries
- `src/backend/routes/wine-labels.ts`: Core API route with caching and validation
- `src/frontend/lib/api-client.ts`: Type-safe HTTP client
- `src/backend/lib/database.ts`: Supabase client configuration
- `src/backend/lib/cache.ts`: Redis caching utilities

## Deployment and Environment

The application is deployed on Vercel with:

- Frontend as static site generation
- Backend as serverless functions
- Supabase for database hosting
- Upstash Redis for caching and rate limiting
- NewRelic for comprehensive observability

Environment variables are configured per the patterns in `env.example` with separate frontend (`VITE_*`) and backend configurations.
