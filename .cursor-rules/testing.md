# Testing Guidelines for AI Agents

## Storybook Stories for Components

### Component Testing Principle

**REQUIRED:** Every React component must have comprehensive Storybook stories testing different parameter
combinations and states.

### Component Story Requirements

**REQUIRED:** Each component must have stories covering:

1. Default state
2. All prop variants
3. Edge cases (empty data, error states)
4. Interactive states (loading, disabled, selected)
5. Responsive breakpoints (if applicable)

```typescript
// WineCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { WineCard } from "./WineCard";
import type { WineLabel } from "#types/wine";

const meta: Meta<typeof WineCard> = {
  title: "Features/Wine Catalog/WineCard",
  component: WineCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["compact", "detailed", "minimal"],
    },
    isSelected: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockWine: WineLabel = {
  id: "1",
  name: "Château Margaux 2015",
  winery: "Château Margaux",
  vintage: 2015,
  region: "Bordeaux, France",
  grape_variety: "Cabernet Sauvignon, Merlot",
  alcohol_content: 13.5,
  tasting_notes: "Elegant and refined with notes of blackcurrant...",
  style: "red",
  created_at: "2023-01-15T10:30:00Z",
  updated_at: "2023-01-15T10:30:00Z",
};

// ✅ REQUIRED: Default story
export const Default: Story = {
  args: {
    wine: mockWine,
    variant: "detailed",
  },
};

// ✅ REQUIRED: All variant combinations
export const Compact: Story = {
  args: {
    wine: mockWine,
    variant: "compact",
  },
};

export const Minimal: Story = {
  args: {
    wine: mockWine,
    variant: "minimal",
  },
};

// ✅ REQUIRED: Interactive states
export const Selected: Story = {
  args: {
    wine: mockWine,
    variant: "detailed",
    isSelected: true,
  },
};

export const Loading: Story = {
  args: {
    wine: mockWine,
    variant: "detailed",
    isLoading: true,
  },
};

// ✅ REQUIRED: Edge cases
export const LongWineName: Story = {
  args: {
    wine: {
      ...mockWine,
      name: "Extremely Long Wine Name That Might Cause Layout Issues in Various Components",
    },
    variant: "detailed",
  },
};

export const MissingImage: Story = {
  args: {
    wine: {
      ...mockWine,
      imageUrl: undefined,
    },
    variant: "detailed",
  },
};

export const VeryOldVintage: Story = {
  args: {
    wine: {
      ...mockWine,
      vintage: 1945,
    },
    variant: "detailed",
  },
};

// ✅ REQUIRED: Error states
export const WithError: Story = {
  args: {
    wine: mockWine,
    variant: "detailed",
    error: "Failed to load wine details",
  },
};
```

### Story Organization and Naming

**REQUIRED:** Follow consistent story organization patterns

```typescript
// Story file naming: ComponentName.stories.tsx
// Story title format: 'Domain/Feature/ComponentName'
// Individual story names: PascalCase describing the state

const meta: Meta<typeof WineCatalog> = {
  title: "Features/Wine Catalog/WineCatalog", // Domain/Feature/Component
  component: WineCatalog,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Wine catalog component with filtering and sorting capabilities.",
      },
    },
  },
};

// Story naming conventions
export const EmptyState: Story = {
  /* ... */
};
export const WithData: Story = {
  /* ... */
};
export const LoadingState: Story = {
  /* ... */
};
export const ErrorState: Story = {
  /* ... */
};
export const MobileViewport: Story = {
  /* ... */
};
export const TabletViewport: Story = {
  /* ... */
};
```

### Using MSW in Stories

**REQUIRED:** Use MSW handlers for stories that require API data

```typescript
// WineCatalog.stories.tsx
import { http, HttpResponse } from "msw";
import { mockWineLabels } from "#mocks/handlers";

export const WithMockData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", () => {
          return HttpResponse.json(mockWineLabels);
        }),
      ],
    },
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/wine-labels", () => {
          // Simulate slow response
          return new Promise((resolve) =>
            setTimeout(() => resolve(HttpResponse.json(mockWineLabels)), 2000)
          );
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
            { error: "Internal server error" },
            { status: 500 }
          );
        }),
      ],
    },
  },
};
```

### Storybook Verification with Playwright

**REQUIRED:** Stories must be verified to render correctly and can be tested with Playwright MCP

```typescript
// Use Playwright MCP to verify stories render correctly
// Example verification commands:

// 1. Navigate to Storybook story
// mcp_playwright_browser_navigate("http://localhost:6006/?path=/story/features-wine-catalog-winecard--default")

// 2. Take screenshot to verify rendering
// mcp_playwright_browser_take_screenshot()

// 3. Test interactive elements
// mcp_playwright_browser_click("Wine card", "wine-card-element")

// 4. Verify error states
// mcp_playwright_browser_wait_for("Error message text")
```

## Unit Tests for Complex Logic

### Unit Testing Principle

**REQUIRED:** All hooks and functions with complex logic must have comprehensive unit tests covering main
conditional branches.

### Testing Hooks

```typescript
// useWineFilters.test.ts
import { renderHook, act } from "@testing-library/react";
import { useWineFilters } from "./useWineFilters";

describe("useWineFilters", () => {
  it("should initialize with empty filters", () => {
    const { result } = renderHook(() => useWineFilters());

    expect(result.current.filters).toEqual({});
  });

  it("should update individual filter values", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
    });

    expect(result.current.filters.region).toBe("Bordeaux");
  });

  it("should handle multiple filter updates", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
      result.current.updateFilter("style", "red");
    });

    expect(result.current.filters).toEqual({
      region: "Bordeaux",
      style: "red",
    });
  });

  it("should clear all filters", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });

  it("should preserve other filters when updating one", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
      result.current.updateFilter("style", "red");
      result.current.updateFilter("region", "Champagne");
    });

    expect(result.current.filters).toEqual({
      region: "Champagne",
      style: "red",
    });
  });
});
```

### Testing Utility Functions

```typescript
// wine-sorting.test.ts
import {
  sortWinesByVintage,
  sortWinesByName,
  sortWinesByRegion,
} from "./wine-sorting";
import type { WineLabel } from "#types/wine";

const mockWines: WineLabel[] = [
  { name: "Wine B", vintage: 2020, region: "Bordeaux" },
  { name: "Wine A", vintage: 2018, region: "Champagne" },
  { name: "Wine C", vintage: 2022, region: "Burgundy" },
] as WineLabel[];

describe("wine-sorting", () => {
  describe("sortWinesByVintage", () => {
    it("should sort wines by vintage in descending order by default", () => {
      const result = sortWinesByVintage(mockWines);

      expect(result.map((w) => w.vintage)).toEqual([2022, 2020, 2018]);
    });

    it("should sort wines by vintage in ascending order when specified", () => {
      const result = sortWinesByVintage(mockWines, "asc");

      expect(result.map((w) => w.vintage)).toEqual([2018, 2020, 2022]);
    });

    it("should handle empty array", () => {
      const result = sortWinesByVintage([]);

      expect(result).toEqual([]);
    });

    it("should handle wines with same vintage", () => {
      const winesWithSameVintage = [
        { name: "Wine A", vintage: 2020 },
        { name: "Wine B", vintage: 2020 },
      ] as WineLabel[];

      const result = sortWinesByVintage(winesWithSameVintage);

      expect(result).toHaveLength(2);
      expect(result.every((w) => w.vintage === 2020)).toBe(true);
    });
  });

  describe("sortWinesByName", () => {
    it("should sort wines alphabetically by name", () => {
      const result = sortWinesByName(mockWines);

      expect(result.map((w) => w.name)).toEqual(["Wine A", "Wine B", "Wine C"]);
    });

    it("should handle case-insensitive sorting", () => {
      const mixedCaseWines = [
        { name: "wine b" },
        { name: "Wine A" },
        { name: "WINE C" },
      ] as WineLabel[];

      const result = sortWinesByName(mixedCaseWines);

      expect(result.map((w) => w.name)).toEqual(["Wine A", "wine b", "WINE C"]);
    });
  });
});
```

### Testing Business Logic

```typescript
// wine-recommendations.test.ts
import { calculateRecommendations } from "./wine-recommendations";
import type { UserPreferences, WineLabel } from "#types/wine";

describe("calculateRecommendations", () => {
  const mockWines: WineLabel[] = [
    { id: "1", style: "red", region: "Bordeaux", vintage: 2018 },
    { id: "2", style: "white", region: "Champagne", vintage: 2020 },
    { id: "3", style: "red", region: "Burgundy", vintage: 2019 },
  ] as WineLabel[];

  it("should recommend wines matching user style preference", () => {
    const preferences: UserPreferences = {
      preferredStyles: ["red"],
      preferredRegions: [],
    };

    const recommendations = calculateRecommendations(mockWines, preferences);

    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((w) => w.style === "red")).toBe(true);
  });

  it("should recommend wines matching region preference", () => {
    const preferences: UserPreferences = {
      preferredStyles: [],
      preferredRegions: ["Bordeaux"],
    };

    const recommendations = calculateRecommendations(mockWines, preferences);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].region).toBe("Bordeaux");
  });

  it("should combine style and region preferences", () => {
    const preferences: UserPreferences = {
      preferredStyles: ["red"],
      preferredRegions: ["Burgundy"],
    };

    const recommendations = calculateRecommendations(mockWines, preferences);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].style).toBe("red");
    expect(recommendations[0].region).toBe("Burgundy");
  });

  it("should return empty array when no wines match preferences", () => {
    const preferences: UserPreferences = {
      preferredStyles: ["sparkling"],
      preferredRegions: ["Tuscany"],
    };

    const recommendations = calculateRecommendations(mockWines, preferences);

    expect(recommendations).toEqual([]);
  });

  it("should return all wines when no preferences specified", () => {
    const preferences: UserPreferences = {
      preferredStyles: [],
      preferredRegions: [],
    };

    const recommendations = calculateRecommendations(mockWines, preferences);

    expect(recommendations).toHaveLength(mockWines.length);
  });
});
```

## MSW Mocks for API Testing

### API Mocking Principle

**REQUIRED:** All API endpoints must have corresponding MSW mock handlers for use in Storybook stories and
unit tests.

### Mock Handler Organization

```typescript
// src/frontend/mocks/handlers.ts
import { http, HttpResponse } from "msw";
import type { components } from "#types/api";

type WineLabel = components["schemas"]["WineLabel"];
type CreateWineLabelRequest = components["schemas"]["CreateWineLabelRequest"];

// ✅ REQUIRED: Mock data that matches API schema exactly
export const mockWineLabels: WineLabel[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Château Margaux 2015",
    winery: "Château Margaux",
    vintage: 2015,
    region: "Bordeaux, France",
    grape_variety: "Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc",
    alcohol_content: 13.5,
    tasting_notes:
      "Elegant and refined with notes of blackcurrant, cedar, and subtle spices.",
    style: "red",
    created_at: "2023-01-15T10:30:00Z",
    updated_at: "2023-01-15T10:30:00Z",
  },
  // More mock data...
];

// ✅ REQUIRED: Handlers for all CRUD operations
export const wineLabelsHandlers = [
  // GET /api/wine-labels
  http.get("/api/wine-labels", ({ request }) => {
    const url = new URL(request.url);
    const style = url.searchParams.get("style");
    const region = url.searchParams.get("region");

    let filteredWines = mockWineLabels;

    if (style) {
      filteredWines = filteredWines.filter((wine) => wine.style === style);
    }

    if (region) {
      filteredWines = filteredWines.filter((wine) =>
        wine.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    return HttpResponse.json(filteredWines);
  }),

  // GET /api/wine-labels/:id
  http.get("/api/wine-labels/:id", ({ params }) => {
    const wine = mockWineLabels.find((w) => w.id === params.id);

    if (!wine) {
      return HttpResponse.json(
        { error: "Wine label not found" },
        { status: 404 }
      );
    }

    return HttpResponse.json(wine);
  }),

  // POST /api/wine-labels
  http.post("/api/wine-labels", async ({ request }) => {
    const body = (await request.json()) as CreateWineLabelRequest;

    const newWine: WineLabel = {
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockWineLabels.push(newWine);

    return HttpResponse.json(newWine, { status: 201 });
  }),

  // PUT /api/wine-labels/:id
  http.put("/api/wine-labels/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<WineLabel>;
    const wineIndex = mockWineLabels.findIndex((w) => w.id === params.id);

    if (wineIndex === -1) {
      return HttpResponse.json(
        { error: "Wine label not found" },
        { status: 404 }
      );
    }

    mockWineLabels[wineIndex] = {
      ...mockWineLabels[wineIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockWineLabels[wineIndex]);
  }),

  // DELETE /api/wine-labels/:id
  http.delete("/api/wine-labels/:id", ({ params }) => {
    const wineIndex = mockWineLabels.findIndex((w) => w.id === params.id);

    if (wineIndex === -1) {
      return HttpResponse.json(
        { error: "Wine label not found" },
        { status: 404 }
      );
    }

    mockWineLabels.splice(wineIndex, 1);

    return HttpResponse.json({ success: true });
  }),
];

// ✅ REQUIRED: Error scenario handlers
export const errorHandlers = [
  http.get("/api/wine-labels", () => {
    return HttpResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }),

  http.get("/api/wine-labels/:id", () => {
    return HttpResponse.json({ error: "Service unavailable" }, { status: 503 });
  }),

  http.post("/api/wine-labels", () => {
    return HttpResponse.json(
      {
        error: "Validation failed",
        details: [
          { field: "name", message: "Name is required" },
          { field: "vintage", message: "Vintage must be a valid year" },
        ],
      },
      { status: 422 }
    );
  }),
];

// Export all handlers
export const handlers = [
  ...wineLabelsHandlers,
  // Add other endpoint handlers here
];
```

### Using Mocks in Tests

```typescript
// useWineLabels.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "#mocks/server";
import { errorHandlers } from "#mocks/handlers";
import { useWineLabels } from "./useWineLabels";

describe("useWineLabels", () => {
  it("should fetch wine labels successfully", async () => {
    const { result } = renderHook(() => useWineLabels());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it("should handle API errors", async () => {
    // Use error handlers for this test
    server.use(...errorHandlers);

    const { result } = renderHook(() => useWineLabels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });
});
```

### Mock Data Management

**REQUIRED:** Keep mock data in sync with API schema and realistic

```typescript
// src/frontend/mocks/factories.ts
import { faker } from "@faker-js/faker";
import type { WineLabel } from "#types/wine";

export function createMockWineLabel(overrides?: Partial<WineLabel>): WineLabel {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    winery: faker.company.name(),
    vintage: faker.date.past({ years: 50 }).getFullYear(),
    region: `${faker.location.city()}, ${faker.location.country()}`,
    grape_variety: faker.helpers.arrayElement([
      "Cabernet Sauvignon",
      "Merlot",
      "Pinot Noir",
      "Chardonnay",
      "Sauvignon Blanc",
    ]),
    alcohol_content: faker.number.float({ min: 8, max: 16, fractionDigits: 1 }),
    tasting_notes: faker.lorem.paragraph(),
    style: faker.helpers.arrayElement(["red", "white", "rosé", "sparkling"]),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createMockWineLabels(count: number): WineLabel[] {
  return Array.from({ length: count }, () => createMockWineLabel());
}
```

### Test Coverage Requirements

**REQUIRED:** Achieve high test coverage for critical business logic

```bash
# Run tests with coverage
pnpm test --coverage

# Coverage thresholds (configure in package.json or vitest.config.ts)
{
  "test": {
    "coverage": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80,
      "exclude": [
        "**/*.stories.tsx",
        "**/*.test.ts",
        "**/mocks/**"
      ]
    }
  }
}
```
