# MSW (Mock Service Worker) in Storybook

This directory contains MSW handlers for mocking API responses in Storybook stories.

## Overview

MSW is set up to intercept network requests and provide mock responses, allowing you to:

- Develop components in isolation without a running backend
- Test different API response scenarios (loading, errors, edge cases)
- Create consistent, reproducible stories

## Configuration

### Files

- `handlers.ts` - Contains all MSW request handlers
- `.storybook/preview.ts` - Configures MSW for all stories
- `.storybook/main.ts` - Includes the MSW Storybook addon

### Global Setup

MSW is configured globally in Storybook with default handlers for all wine label API endpoints:

- `GET /health` - Health check
- `GET /api/wine-labels` - List wine labels (with filtering & pagination)
- `GET /api/wine-labels/:id` - Get single wine label
- `POST /api/wine-labels` - Create wine label
- `PUT /api/wine-labels/:id` - Update wine label
- `DELETE /api/wine-labels/:id` - Delete wine label

## Using MSW in Stories

### Default Behavior

By default, all stories use the mock handlers defined in `handlers.ts`. No additional configuration needed:

```typescript
export const Default: Story = {
  // Uses default MSW handlers automatically
};
```

### Override Handlers for Specific Stories

Override handlers for specific scenarios:

```typescript
import { http, HttpResponse } from "msw";

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", async () => {
          await delay("infinite"); // Infinite loading
        }),
      ],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", () => {
          return HttpResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "Server error" },
            { status: 500 }
          );
        }),
      ],
    },
  },
};
```

### Common Patterns

#### Empty State

```typescript
export const EmptyState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", () => {
          return HttpResponse.json({
            success: true,
            data: [],
            total: 0,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
  },
};
```

#### Filtered Results

```typescript
export const FilteredResults: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", ({ request }) => {
          const url = new URL(request.url);
          const style = url.searchParams.get("style");

          // Filter mock data based on query params
          const filteredData = mockData.filter((item) =>
            style ? item.style === style : true
          );

          return HttpResponse.json({
            success: true,
            data: filteredData,
            total: filteredData.length,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
  },
};
```

#### Rate Limiting

```typescript
export const RateLimited: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", () => {
          return HttpResponse.json(
            {
              error: "RATE_LIMIT_EXCEEDED",
              message: "Too many requests",
              retryAfter: 60,
            },
            { status: 429 }
          );
        }),
      ],
    },
  },
};
```

#### Slow Network

```typescript
import { delay } from "msw";

export const SlowNetwork: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", async () => {
          await delay(3000); // 3 second delay
          return HttpResponse.json(mockResponse);
        }),
      ],
    },
  },
};
```

## Adding New Endpoints

To mock new API endpoints:

1. Add the handler to `handlers.ts`:

    ```typescript
    export const handlers = [
      // ... existing handlers

      http.get("/api/new-endpoint", () => {
        return HttpResponse.json({
          success: true,
          data: mockData,
        });
      }),
    ];
    ```

2. Update the TypeScript types in `src/frontend/types/api.ts` if needed

3. The new endpoint will be automatically available in all stories

## Best Practices

1. **Keep mock data realistic** - Use data that represents actual use cases
2. **Test edge cases** - Create stories for empty states, errors, and loading
3. **Use TypeScript** - Ensure mock responses match your API types
4. **Document story scenarios** - Add descriptions explaining what each story demonstrates
5. **Reset state between stories** - MSW automatically handles this
6. **Use delay() for loading states** - Simulate network latency when needed

## Troubleshooting

### Handler Not Working

- Check the URL path matches exactly (including leading slash)
- Ensure the HTTP method matches (GET, POST, etc.)
- Verify the handler is imported in the story or global config

### TypeScript Errors

- Ensure mock response data matches the expected API types
- Import types from `src/frontend/types/api.ts`
- Use type assertions if needed: `as components['schemas']['WineLabel']`

### Network Requests Still Going to Real API

- Check browser Network tab to see if MSW is intercepting requests
- Look for MSW activation messages in browser console
- Ensure the MSW service worker is properly initialized
