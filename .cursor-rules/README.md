# Cursor Rules for AI Agents

This directory contains comprehensive guidelines for AI agents developing the Winette project. These rules
ensure consistency, quality, and maintainability across all code contributions.

## Overview

The rules are organized into focused areas of development:

- **[Architecture](./architecture.md)** - Composition patterns, domain structure, and custom hooks
- **[Testing](./testing.md)** - Storybook stories, unit tests, and MSW mocks
- **[Frontend Patterns](./frontend-patterns.md)** - Suspense, styling, and localization
- **[API Design](./api-design.md)** - Schema validation and endpoint standards

## How to Use These Rules

### For AI Agents

1. **Read all rule files** before starting development
2. **Follow the patterns** exactly as specified in the examples
3. **Validate compliance** using the verification methods mentioned
4. **Update rules** if patterns need to evolve (with team approval)

### For Developers

1. **Reference these rules** when working with AI agents
2. **Provide feedback** on rule effectiveness and clarity
3. **Suggest improvements** based on development experience
4. **Ensure consistency** with existing codebase patterns

## Rule Categories

### 🏗️ Architecture (`architecture.md`)

**Key Principles:**

- Composition over configuration with small, focused functions
- Domain-driven folder structure (not role-based)
- Extract all logic from React components into custom hooks
- Use path mapping for clean imports

**Verification:**

- Functions have ≤3 parameters
- Components are primarily presentational
- Hooks are tested and reusable
- Folder structure follows domain boundaries

### 🧪 Testing (`testing.md`)

**Key Requirements:**

- Every component has comprehensive Storybook stories
- All hooks/functions with complex logic have unit tests
- MSW mocks for all API endpoints
- Stories can be verified with Playwright MCP

**Verification:**

- Run `pnpm storybook` to check all stories render
- Run `pnpm test --coverage` for test coverage
- Use Playwright MCP to verify story interactions

### 🎨 Frontend Patterns (`frontend-patterns.md`)

**Key Standards:**

- Suspense boundaries with skeleton UI for loading states
- Error boundaries with contextual error messages
- Vanilla Extract for all styling in separate `.css.ts` files
- i18n keys for all visible text with proper interpolation

**Verification:**

- Check loading states work correctly
- Verify error boundaries catch and display errors
- Validate all text is translatable
- Ensure styles follow design tokens

### 🔌 API Design (`api-design.md`)

**Key Standards:**

- OpenAPI schema as single source of truth
- Validation on both backend and frontend
- RESTful patterns with consistent error handling
- Generated TypeScript types from schema

**Verification:**

- Schema validation passes on all endpoints
- Frontend types match backend schema
- Error responses follow standard format
- API documentation is up to date

## Quick Reference

### Before Creating Components

- [ ] Plan Storybook stories for all variants
- [ ] Identify reusable logic for custom hooks
- [ ] Check if styling follows design tokens
- [ ] Ensure all text has i18n keys

### Before Creating API Endpoints

- [ ] Define schema in OpenAPI specification
- [ ] Add validation middleware for requests/responses
- [ ] Create MSW mocks for testing
- [ ] Generate TypeScript types

### Before Submitting Changes

- [ ] All Storybook stories render correctly
- [ ] Unit tests pass with good coverage
- [ ] Error boundaries handle failures gracefully
- [ ] API validation works on both ends
- [ ] No hardcoded text strings

## Verification Tools

### Storybook Verification with Playwright MCP

Use these commands to verify stories:

```typescript
// Navigate to story
mcp_playwright_browser_navigate(
  "http://localhost:6006/?path=/story/features-wine-catalog-winecard--default"
);

// Take screenshot
mcp_playwright_browser_take_screenshot();

// Test interactions
mcp_playwright_browser_click("Wine card", "wine-card-element");

// Verify states
mcp_playwright_browser_wait_for("Loading indicator");
```

### API Schema Validation

```bash
# Generate types from schema
pnpm generate:api-types

# Validate schema
pnpm validate:api-schema

# Test endpoint compliance
pnpm test:api
```

## Pattern Examples

### Component with Hook Pattern

```typescript
// ✅ GOOD: Logic extracted to hook
export function WineCatalog() {
  const { wines, loading, error } = useWineLabels();
  const { filters, updateFilter } = useWineFilters();

  if (loading) return <WineCatalogSkeleton />;
  if (error) throw error;

  return (
    <WineGrid wines={wines} filters={filters} onFilterChange={updateFilter} />
  );
}
```

### Storybook Story Pattern

```typescript
// ✅ GOOD: Comprehensive story coverage
export const Default: Story = { args: { wine: mockWine } };
export const Loading: Story = { args: { wine: mockWine, isLoading: true } };
export const Error: Story = {
  args: { wine: mockWine, error: "Failed to load" },
};
export const LongName: Story = {
  args: { wine: { ...mockWine, name: "Very Long Wine Name..." } },
};
```

### API Endpoint Pattern

```typescript
// ✅ GOOD: Validated endpoint
router.post(
  "/wine-labels",
  validateRequestBody("CreateWineLabelRequest"),
  validateResponseBody("WineLabel"),
  async (req, res, next) => {
    try {
      const wine = await service.create(req.body);
      res.status(201).json(wine);
    } catch (error) {
      next(error);
    }
  }
);
```

## Common Anti-Patterns to Avoid

### ❌ Large Components with Mixed Concerns

```typescript
// BAD: Logic mixed with presentation
export function WineCatalog() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    // Complex data fetching logic
    // Filtering logic
    // Sorting logic
  }, []);

  // Complex render with inline handlers
}
```

### ❌ Hardcoded Text

```typescript
// BAD: Hardcoded strings
<button>Add to Cart</button>
<p>Wine not found</p>

// GOOD: i18n keys
<button>{t('wine.addToCart')}</button>
<p>{t('wine.notFound')}</p>
```

### ❌ Inline Styles

```typescript
// BAD: Inline styles
<div style={{ padding: '1rem', backgroundColor: '#f5f5f5' }}>

// GOOD: Vanilla Extract classes
<div className={styles.container}>
```

### ❌ Unvalidated API Data

```typescript
// BAD: No validation
const data = await response.json();
return data; // Could be any shape

// GOOD: Schema validation
const data = await response.json();
return wineLabelSchema.parse(data);
```

## Continuous Improvement

These rules should evolve with the project. When you discover better patterns or encounter edge cases:

1. **Document the pattern** in the appropriate rule file
2. **Provide examples** of good and bad implementations
3. **Update verification methods** if needed
4. **Share learnings** with the development team

Remember: The goal is consistent, maintainable, and high-quality code that supports the long-term success
of the Winette project.
