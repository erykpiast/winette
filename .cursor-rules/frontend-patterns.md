# Frontend Patterns Guidelines for AI Agents

## Suspense and Error Boundaries

### Principle

**REQUIRED:** All data loading and error handling must use React Suspense and Error Boundaries with proper
Loading and Error Fallback components.

### Data Loading with Suspense

**REQUIRED:** Wrap data-dependent components in Suspense boundaries with skeleton UI

```typescript
// App.tsx - Top-level Suspense setup
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "#components/ErrorFallback";
import { LoadingFallback } from "#components/LoadingFallback";

export function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Router>
          <Routes>
            <Route
              path="/wines"
              element={
                <Suspense fallback={<WineCatalogSkeleton />}>
                  <WineCatalogPage />
                </Suspense>
              }
            />
            <Route
              path="/wines/:id"
              element={
                <Suspense fallback={<WineDetailSkeleton />}>
                  <WineDetailPage />
                </Suspense>
              }
            />
          </Routes>
        </Router>
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Loading Fallback Components

**REQUIRED:** Create skeleton UI components that match the layout of actual content

```typescript
// LoadingFallback.tsx - Generic loading fallback
export function LoadingFallback(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} aria-label={t("loading.label")} />
      <p className={styles.loadingText}>{t("loading.message")}</p>
    </div>
  );
}

// WineCatalogSkeleton.tsx - Content-specific skeleton
export function WineCatalogSkeleton(): JSX.Element {
  return (
    <div className={styles.catalogContainer}>
      <div className={styles.filtersSection}>
        <div className={styles.skeletonFilter} />
        <div className={styles.skeletonFilter} />
        <div className={styles.skeletonFilter} />
      </div>

      <div className={styles.wineGrid}>
        {Array.from({ length: 12 }, (_, i) => (
          <WineCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// WineCardSkeleton.tsx - Detailed component skeleton
export function WineCardSkeleton(): JSX.Element {
  return (
    <div className={styles.cardSkeleton}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSubtitle} />
        <div className={styles.skeletonPrice} />
      </div>
    </div>
  );
}
```

### Error Boundary Implementation

**REQUIRED:** Implement contextual error boundaries with recovery options

```typescript
// ErrorFallback.tsx - Main error fallback component
import { useTranslation } from "react-i18next";
import type { FallbackProps } from "react-error-boundary";

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h2 className={styles.errorTitle}>{t("error.title")}</h2>
      <p className={styles.errorMessage}>{t("error.message")}</p>

      <div className={styles.errorActions}>
        <button
          type="button"
          onClick={resetErrorBoundary}
          className={styles.retryButton}
        >
          {t("error.retry")}
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className={styles.homeButton}
        >
          {t("error.backToHome")}
        </button>
      </div>

      {import.meta.env.DEV && (
        <details className={styles.errorDetails}>
          <summary>{t("error.technicalDetails")}</summary>
          <pre className={styles.errorStack}>{error.stack}</pre>
        </details>
      )}
    </div>
  );
}

// WineCatalogErrorFallback.tsx - Feature-specific error fallback
export function WineCatalogErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className={styles.catalogErrorContainer}>
      <h3 className={styles.errorTitle}>{t("wineCatalog.error.title")}</h3>
      <p className={styles.errorMessage}>{t("wineCatalog.error.message")}</p>

      <div className={styles.errorSuggestions}>
        <p>{t("wineCatalog.error.suggestions")}</p>
        <ul>
          <li>{t("wineCatalog.error.checkConnection")}</li>
          <li>{t("wineCatalog.error.tryAgainLater")}</li>
          <li>{t("wineCatalog.error.contactSupport")}</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={resetErrorBoundary}
        className={styles.retryButton}
      >
        {t("wineCatalog.error.retry")}
      </button>
    </div>
  );
}
```

### Data Fetching Patterns

**REQUIRED:** Use hooks that integrate with Suspense for data fetching

```typescript
// useWineLabels.ts - Suspense-compatible data fetching
import { useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "#lib/api-client";
import { wineLabelSchema } from "#types/wine";

export function useWineLabels(filters?: WineFilters) {
  return useSuspenseQuery({
    queryKey: ["wine-labels", filters],
    queryFn: async () => {
      const response = await apiClient.get("/wine-labels", { params: filters });
      return wineLabelSchema.array().parse(response.data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// WineCatalogPage.tsx - Component using Suspense data
export function WineCatalogPage(): JSX.Element {
  const { filters } = useWineFilters();
  const { data: wines } = useWineLabels(filters); // Will suspend until data loads
  const { sortBy } = useWineSorting();

  const sortedWines = useMemo(() => {
    return applySorting(wines, sortBy);
  }, [wines, sortBy]);

  return (
    <div className={styles.catalogPage}>
      <WineFilters />
      <WineSorting />
      <WineGrid wines={sortedWines} />
    </div>
  );
}
```

## Styling with Vanilla Extract

### Styling Principle

**REQUIRED:** All styling must be written in JavaScript using Vanilla Extract in separate `*.css.ts` files.

### File Organization

**REQUIRED:** Co-locate styles with components using consistent naming

```text
src/features/wine-catalog/
├── components/
│   ├── WineCatalog/
│   │   ├── WineCatalog.tsx
│   │   ├── WineCatalog.css.ts      # Component styles
│   │   ├── WineCatalog.stories.tsx
│   │   └── WineCatalog.test.tsx
│   └── WineCard/
│       ├── WineCard.tsx
│       ├── WineCard.css.ts         # Component styles
│       ├── WineCard.stories.tsx
│       └── WineCard.test.tsx
```

### Design System Integration

**REQUIRED:** Use design tokens and consistent spacing/typography scales

```typescript
// src/frontend/styles/tokens.css.ts
import { createGlobalTheme } from "@vanilla-extract/css";

export const tokens = createGlobalTheme(":root", {
  color: {
    primary: {
      50: "#fef2f2",
      100: "#fee2e2",
      500: "#ef4444",
      900: "#7f1d1d",
    },
    neutral: {
      50: "#fafafa",
      100: "#f5f5f5",
      500: "#737373",
      900: "#171717",
    },
    semantic: {
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },
  },
  space: {
    "1": "0.25rem",
    "2": "0.5rem",
    "4": "1rem",
    "6": "1.5rem",
    "8": "2rem",
    "12": "3rem",
    "16": "4rem",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
  borderRadius: {
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
});
```

### Component Styling Patterns

**REQUIRED:** Follow consistent styling patterns for components

```typescript
// WineCard.css.ts
import { style, styleVariants } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { tokens } from "#styles/tokens.css";

// Base styles
export const card = style({
  backgroundColor: tokens.color.neutral[50],
  borderRadius: tokens.borderRadius.lg,
  boxShadow: tokens.shadows.md,
  padding: tokens.space[4],
  transition: "all 0.2s ease-in-out",

  ":hover": {
    boxShadow: tokens.shadows.lg,
    transform: "translateY(-2px)",
  },
});

// Variant styles using styleVariants
export const cardVariants = styleVariants({
  compact: {
    padding: tokens.space[2],
    minHeight: "200px",
  },
  detailed: {
    padding: tokens.space[6],
    minHeight: "300px",
  },
  minimal: {
    padding: tokens.space[4],
    minHeight: "150px",
    boxShadow: "none",
    border: `1px solid ${tokens.color.neutral[100]}`,
  },
});

// Complex component using recipe
export const wineCard = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.color.neutral[50],
    borderRadius: tokens.borderRadius.lg,
    overflow: "hidden",
    transition: "all 0.2s ease-in-out",
  },

  variants: {
    variant: {
      compact: {
        maxWidth: "200px",
        minHeight: "250px",
      },
      detailed: {
        maxWidth: "300px",
        minHeight: "400px",
      },
      minimal: {
        maxWidth: "150px",
        minHeight: "200px",
      },
    },

    isSelected: {
      true: {
        outline: `2px solid ${tokens.color.primary[500]}`,
        outlineOffset: "2px",
      },
    },

    isLoading: {
      true: {
        opacity: "0.6",
        pointerEvents: "none",
      },
    },
  },

  compoundVariants: [
    {
      variants: {
        variant: "detailed",
        isSelected: true,
      },
      style: {
        transform: "scale(1.02)",
      },
    },
  ],

  defaultVariants: {
    variant: "detailed",
    isSelected: false,
    isLoading: false,
  },
});

// Layout styles
export const cardContent = style({
  padding: tokens.space[4],
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space[2],
});

export const cardImage = style({
  width: "100%",
  height: "200px",
  objectFit: "cover",
  backgroundColor: tokens.color.neutral[100],
});

export const cardTitle = style({
  fontSize: tokens.fontSize.lg,
  fontWeight: "600",
  lineHeight: tokens.lineHeight.tight,
  color: tokens.color.neutral[900],
  marginBottom: tokens.space[1],
});

export const cardSubtitle = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.neutral[500],
  lineHeight: tokens.lineHeight.normal,
});

// Responsive styles
export const responsiveGrid = style({
  display: "grid",
  gap: tokens.space[4],
  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",

  "@media": {
    "screen and (max-width: 768px)": {
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: tokens.space[2],
    },

    "screen and (max-width: 480px)": {
      gridTemplateColumns: "1fr",
      gap: tokens.space[2],
    },
  },
});
```

### Using Styles in Components

**REQUIRED:** Import and apply styles using Vanilla Extract classes

```typescript
// WineCard.tsx
import { clsx } from "clsx";
import * as styles from "./WineCard.css";
import type { WineLabel } from "#types/wine";

interface WineCardProps {
  wine: WineLabel;
  variant?: "compact" | "detailed" | "minimal";
  isSelected?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

export function WineCard({
  wine,
  variant = "detailed",
  isSelected = false,
  isLoading = false,
  onClick,
}: WineCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className={styles.wineCard({ variant, isSelected, isLoading })}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={t("wineCard.selectLabel", { name: wine.name })}
    >
      {wine.imageUrl && (
        <img
          src={wine.imageUrl}
          alt={t("wineCard.imageAlt", { name: wine.name })}
          className={styles.cardImage}
        />
      )}

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{wine.name}</h3>
        <p className={styles.cardSubtitle}>
          {wine.winery} • {wine.vintage}
        </p>
        <p className={styles.cardSubtitle}>{wine.region}</p>

        {variant === "detailed" && wine.tasting_notes && (
          <p className={clsx(styles.cardSubtitle, styles.tastingNotes)}>
            {wine.tasting_notes}
          </p>
        )}
      </div>
    </div>
  );
}
```

## Localization (i18n)

### Localization Principle

**REQUIRED:** All visible text must be located in localization files and referenced by keys in the code.

### Translation File Organization

**REQUIRED:** Organize translations by domain and feature

```text
public/locales/
├── en/
│   ├── common.json              # Shared across features
│   ├── navigation.json          # Navigation-specific
│   ├── wine-catalog.json        # Wine catalog feature
│   ├── wine-details.json        # Wine details feature
│   ├── user-preferences.json    # User preferences feature
│   └── error.json              # Error messages
└── fr/
    ├── common.json
    ├── navigation.json
    ├── wine-catalog.json
    ├── wine-details.json
    ├── user-preferences.json
    └── error.json
```

### Translation Key Structure

**REQUIRED:** Use hierarchical, descriptive keys

```json
// public/locales/en/wine-catalog.json
{
  "title": "Wine Catalog",
  "subtitle": "Discover exceptional wines from around the world",

  "filters": {
    "title": "Filter Wines",
    "region": {
      "label": "Region",
      "placeholder": "Select a region...",
      "all": "All Regions"
    },
    "style": {
      "label": "Wine Style",
      "placeholder": "Select a style...",
      "options": {
        "red": "Red Wine",
        "white": "White Wine",
        "rosé": "Rosé Wine",
        "sparkling": "Sparkling Wine"
      }
    },
    "vintage": {
      "label": "Vintage",
      "from": "From",
      "to": "To"
    },
    "clear": "Clear Filters",
    "apply": "Apply Filters"
  },

  "sorting": {
    "label": "Sort by",
    "options": {
      "name": "Name",
      "vintage": "Vintage",
      "region": "Region",
      "price": "Price"
    },
    "direction": {
      "asc": "Ascending",
      "desc": "Descending"
    }
  },

  "results": {
    "count": "{{count}} wines found",
    "count_one": "{{count}} wine found",
    "count_zero": "No wines found",
    "loading": "Loading wines...",
    "empty": {
      "title": "No wines match your criteria",
      "message": "Try adjusting your filters or search terms",
      "action": "Clear filters"
    }
  },

  "card": {
    "imageAlt": "Image of {{name}}",
    "selectLabel": "Select {{name}}",
    "vintage": "Vintage {{year}}",
    "alcoholContent": "{{percentage}}% ABV",
    "addToFavorites": "Add to favorites",
    "removeFromFavorites": "Remove from favorites"
  },

  "actions": {
    "viewDetails": "View Details",
    "addToCollection": "Add to Collection",
    "share": "Share",
    "compare": "Compare"
  }
}
```

### Using Translations in Components

**REQUIRED:** Use translation hooks with proper interpolation and pluralization

```typescript
// WineCatalog.tsx
import { useTranslation } from "react-i18next";

export function WineCatalog(): JSX.Element {
  const { t } = useTranslation("wine-catalog");
  const { data: wines, isLoading } = useWineLabels();
  const { filters } = useWineFilters();

  const filteredCount = wines?.length ?? 0;

  return (
    <div className={styles.catalog}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </header>

      <div className={styles.controls}>
        <WineFilters />
        <WineSorting />
      </div>

      <div className={styles.results}>
        <p className={styles.resultCount}>
          {t("results.count", { count: filteredCount })}
        </p>

        {isLoading ? (
          <p className={styles.loadingMessage}>{t("results.loading")}</p>
        ) : (
          <WineGrid wines={wines} />
        )}
      </div>
    </div>
  );
}

// WineFilters.tsx
export function WineFilters(): JSX.Element {
  const { t } = useTranslation("wine-catalog");
  const { filters, updateFilter, clearFilters } = useWineFilters();

  return (
    <div className={styles.filters}>
      <h2 className={styles.filtersTitle}>{t("filters.title")}</h2>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          {t("filters.region.label")}
        </label>
        <select
          value={filters.region || ""}
          onChange={(e) => updateFilter("region", e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">{t("filters.region.placeholder")}</option>
          <option value="bordeaux">
            {t("filters.region.options.bordeaux")}
          </option>
          <option value="champagne">
            {t("filters.region.options.champagne")}
          </option>
        </select>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className={styles.clearButton}
      >
        {t("filters.clear")}
      </button>
    </div>
  );
}
```

### Translation Key Guidelines

**REQUIRED:** Follow these guidelines for translation keys

```typescript
// ✅ GOOD: Descriptive, hierarchical keys
t("wine-catalog.filters.region.label");
t("wine-catalog.results.count", { count: 42 });
t("wine-catalog.card.imageAlt", { name: "Château Margaux" });

// ❌ BAD: Generic, flat keys
t("label");
t("count");
t("image");

// ✅ GOOD: Interpolation with context
t("user.welcome", { firstName: user.firstName });
t("wine.description", {
  name: wine.name,
  vintage: wine.vintage,
  region: wine.region,
});

// ✅ GOOD: Pluralization
t("results.count", { count: wines.length });
// Handles: "1 wine found" vs "5 wines found" vs "No wines found"

// ✅ GOOD: Context-aware translations
t("button.save", { context: "wine-details" }); // "Save Wine"
t("button.save", { context: "user-profile" }); // "Save Profile"
```

### Type-Safe Translations

**REQUIRED:** Use TypeScript for translation key validation

```typescript
// src/frontend/types/i18n.ts
export interface TranslationResources {
  "wine-catalog": {
    title: string;
    subtitle: string;
    filters: {
      title: string;
      region: {
        label: string;
        placeholder: string;
      };
    };
    results: {
      count: string;
      count_one: string;
      count_zero: string;
    };
  };
  common: {
    loading: string;
    error: string;
    retry: string;
  };
}

// Extend react-i18next types
declare module "react-i18next" {
  interface CustomTypeOptions {
    resources: TranslationResources;
  }
}

// Now you get autocomplete and type checking
const { t } = useTranslation("wine-catalog");
t("title"); // ✅ Valid
t("filters.region.label"); // ✅ Valid
t("invalid.key"); // ❌ TypeScript error
```

### Dynamic Content Localization

**REQUIRED:** Handle dynamic content with proper fallbacks

```typescript
// For user-generated content or API data
export function WineCard({ wine }: { wine: WineLabel }): JSX.Element {
  const { t, i18n } = useTranslation("wine-catalog");

  // Handle localized wine data if available
  const localizedName = wine.translations?.[i18n.language]?.name || wine.name;
  const localizedDescription =
    wine.translations?.[i18n.language]?.description || wine.tasting_notes;

  return (
    <div className={styles.card}>
      <h3>{localizedName}</h3>
      <p>{localizedDescription}</p>
      <p>{t("card.vintage", { year: wine.vintage })}</p>
    </div>
  );
}

// For date/number formatting
export function formatWinePrice(price: number, currency: string): string {
  const { i18n } = useTranslation();

  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency,
  }).format(price);
}

export function formatWineDate(date: string): string {
  const { i18n } = useTranslation();

  return new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
```
