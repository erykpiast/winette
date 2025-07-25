# Architecture Guidelines for AI Agents

## Composition Over Configuration

### Principle

Build systems from many small, focused functions and components rather than large configurable ones.
This approach improves reusability, testability, and maintainability.

### Small Functions with Few Parameters

**REQUIRED:** Functions should have 3 or fewer parameters when possible

```typescript
// ✅ GOOD: Small, focused function
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// ❌ BAD: Too many parameters, too much responsibility
export function processWineData(
  wine: Wine,
  priceFormatter: (amount: number, currency: string) => string,
  imageTransformer: (url: string, width: number, height: number) => string,
  validator: (wine: Wine) => ValidationResult,
  cache: Map<string, ProcessedWine>,
  options: ProcessingOptions
): ProcessedWine {
  // Complex logic mixing concerns
}

// ✅ GOOD: Composed from smaller functions
export function processWineData(wine: Wine): ProcessedWine {
  const formattedPrice = formatPrice(wine.price, wine.currency);
  const thumbnailUrl = createThumbnail(wine.imageUrl);
  const validation = validateWine(wine);

  return { ...wine, formattedPrice, thumbnailUrl, validation };
}
```

### High Code Reuse Through Composition

**REQUIRED:** Build complex functionality by composing simple, reusable parts

```typescript
// ✅ GOOD: Reusable building blocks
export function useApiData<T>(endpoint: string) {
  // Generic data fetching logic
}

export function useApiValidation<T>(data: T, schema: ZodSchema<T>) {
  // Generic validation logic
}

export function useOptimisticUpdates<T>(
  data: T,
  updateFn: (data: T) => Promise<T>
) {
  // Generic optimistic update logic
}

// Compose them for specific use cases
export function useWineLabels() {
  const { data, loading, error } = useApiData<WineLabel[]>("/api/wine-labels");
  const validation = useApiValidation(data, wineLabelSchema);
  const optimisticUpdates = useOptimisticUpdates(data, updateWineLabel);

  return { data, loading, error, validation, ...optimisticUpdates };
}
```

### Single Responsibility Principle

**REQUIRED:** Each function/component should have one clear purpose

```typescript
// ✅ GOOD: Single responsibility
export function extractWineMetadata(wine: Wine): WineMetadata {
  return {
    region: wine.region,
    vintage: wine.vintage,
    grapeVariety: wine.grape_variety,
    alcoholContent: wine.alcohol_content,
  };
}

export function formatWineForDisplay(
  wine: Wine,
  metadata: WineMetadata
): DisplayWine {
  return {
    ...wine,
    displayName: `${wine.name} (${metadata.vintage})`,
    regionDisplay: formatRegion(metadata.region),
    alcoholDisplay: `${metadata.alcoholContent}% ABV`,
  };
}

// ❌ BAD: Multiple responsibilities
export function processWineForDisplay(wine: Wine): DisplayWine {
  // Extracting metadata
  const region = wine.region;
  const vintage = wine.vintage;
  // Formatting for display
  const displayName = `${wine.name} (${vintage})`;
  // Validation
  if (!region || !vintage) throw new Error("Invalid wine");
  // Complex formatting logic
  // ...
}
```

## Domain-Driven Folder Structure

### Organization by Domain, Not Role

**REQUIRED:** Group code by business domain/feature rather than technical concerns

```text
src/
├── frontend/
│   ├── features/                     # Domain-specific features
│   │   ├── wine-catalog/
│   │   │   ├── components/
│   │   │   │   ├── WineCatalog.tsx
│   │   │   │   ├── WineCatalog.css.ts
│   │   │   │   ├── WineCatalog.stories.tsx
│   │   │   │   └── WineCatalog.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWineFilters.ts
│   │   │   │   └── useWineSearch.ts
│   │   │   ├── types/
│   │   │   │   └── wine-catalog.ts
│   │   │   └── utils/
│   │   │       └── wine-sorting.ts
│   │   ├── user-preferences/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── wine-recommendations/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── algorithms/
│   └── shared/                       # Shared across 3+ domains
│       ├── components/
│       │   ├── ui/                   # Generic UI components
│       │   └── layout/               # Layout components
│       ├── hooks/
│       │   ├── useApiClient.ts       # Generic API logic
│       │   └── useLocalStorage.ts    # Generic storage logic
│       └── utils/
│           ├── formatting/
│           └── validation/
```

### When to Use Shared vs Domain-Specific

**REQUIRED:** Only move code to shared when used in 3+ domains

```typescript
// ✅ GOOD: Domain-specific hook stays in feature folder
// src/features/wine-catalog/hooks/useWineFilters.ts
export function useWineFilters(wines: WineLabel[]) {
  // Wine-specific filtering logic
}

// ✅ GOOD: Generic hook goes to shared when used in 3+ domains
// src/shared/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  // Generic debouncing logic used across multiple features
}

// ✅ GOOD: Feature-specific utility stays in domain
// src/features/wine-catalog/utils/wine-sorting.ts
export function sortWinesByVintage(wines: WineLabel[]): WineLabel[] {
  // Wine-specific sorting logic
}
```

## Custom Hooks for Logic Extraction

### Logic Extraction Principle

**REQUIRED:** Extract all complex logic from React components into custom hooks. Components should primarily
handle rendering and user interaction.

### Logic Extraction Examples

```typescript
// ❌ BAD: Logic mixed with component
export function WineCatalog() {
  const [wines, setWines] = useState<WineLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ region: "", style: "" });
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    const fetchWines = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/wine-labels");
        const data = await response.json();
        setWines(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWines();
  }, []);

  const filteredWines = useMemo(() => {
    return wines
      .filter(
        (wine) =>
          (!filters.region || wine.region.includes(filters.region)) &&
          (!filters.style || wine.style === filters.style)
      )
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "vintage") return b.vintage - a.vintage;
        return 0;
      });
  }, [wines, filters, sortBy]);

  // Complex render logic...
}

// ✅ GOOD: Logic extracted to hooks
export function WineCatalog() {
  const { wines, loading, error } = useWineLabels();
  const { filters, updateFilter, clearFilters } = useWineFilters();
  const { sortBy, setSortBy, sortedWines } = useWineSorting(wines);
  const filteredAndSortedWines = useFilteredWines(sortedWines, filters);

  if (loading) return <LoadingSkeleton />;
  if (error) throw error;

  return (
    <div>
      <WineFilters
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
      />
      <WineSorting sortBy={sortBy} onSortChange={setSortBy} />
      <WineGrid wines={filteredAndSortedWines} />
    </div>
  );
}
```

### Custom Hook Patterns

**REQUIRED:** Follow these patterns for consistent hook design

```typescript
// Data fetching hooks
export function useWineLabels() {
  return useApiData<WineLabel[]>("/api/wine-labels", wineLabelSchema);
}

// State management hooks
export function useWineFilters() {
  const [filters, setFilters] = useState<WineFilters>({});

  const updateFilter = useCallback((key: keyof WineFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return { filters, updateFilter, clearFilters };
}

// Business logic hooks
export function useWineRecommendations(userPreferences: UserPreferences) {
  const { wines } = useWineLabels();

  const recommendations = useMemo(() => {
    return calculateRecommendations(wines, userPreferences);
  }, [wines, userPreferences]);

  return { recommendations };
}

// Side effect hooks
export function useWineAnalytics(wineId: string) {
  useEffect(() => {
    trackWineView(wineId);
  }, [wineId]);

  const trackWineInteraction = useCallback(
    (action: string) => {
      trackEvent("wine_interaction", { wineId, action });
    },
    [wineId]
  );

  return { trackWineInteraction };
}
```

### Hook Composition Guidelines

**REQUIRED:** Compose hooks to build complex functionality

```typescript
// ✅ GOOD: Composing simple hooks
export function useWineCatalogData() {
  const { wines, loading, error } = useWineLabels();
  const { filters } = useWineFilters();
  const { sortBy } = useWineSorting();

  const processedWines = useMemo(() => {
    const filtered = applyFilters(wines, filters);
    const sorted = applySorting(filtered, sortBy);
    return sorted;
  }, [wines, filters, sortBy]);

  return { wines: processedWines, loading, error };
}

// ✅ GOOD: Higher-order hook pattern
export function useApiResource<T>(
  endpoint: string,
  schema: ZodSchema<T>,
  options?: ApiResourceOptions
) {
  const { data, loading, error } = useApiData<T>(endpoint);
  const validation = useApiValidation(data, schema);
  const optimistic = useOptimisticUpdates(data, options?.updateFn);

  return {
    data: validation.isValid ? data : null,
    loading,
    error: error || validation.error,
    ...optimistic,
  };
}
```

### Testing Custom Hooks

**REQUIRED:** All custom hooks with complex logic must have unit tests

```typescript
// useWineFilters.test.ts
import { renderHook, act } from "@testing-library/react";
import { useWineFilters } from "./useWineFilters";

describe("useWineFilters", () => {
  it("should update filter values correctly", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
    });

    expect(result.current.filters.region).toBe("Bordeaux");
  });

  it("should clear all filters", () => {
    const { result } = renderHook(() => useWineFilters());

    act(() => {
      result.current.updateFilter("region", "Bordeaux");
      result.current.updateFilter("style", "red");
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });
});
```

## Path Mapping and Import Conventions

**REQUIRED:** Use path mapping for clean imports and better code organization

```typescript
// tsconfig.json paths configuration
{
  "compilerOptions": {
    "paths": {
      "#components/*": ["./src/frontend/shared/components/*"],
      "#hooks/*": ["./src/frontend/shared/hooks/*"],
      "#utils/*": ["./src/frontend/shared/utils/*"],
      "#types/*": ["./src/frontend/shared/types/*"],
      "#features/*": ["./src/frontend/features/*"]
    }
  }
}

// ✅ GOOD: Clean imports with path mapping
import { Button } from '#components/ui/Button';
import { useApiClient } from '#hooks/useApiClient';
import { formatPrice } from '#utils/formatting/currency';
import { useWineFilters } from '#features/wine-catalog/hooks/useWineFilters';

// ❌ BAD: Relative imports getting messy
import { Button } from '../../../shared/components/ui/Button';
import { useApiClient } from '../../../shared/hooks/useApiClient';
```
