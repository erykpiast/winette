# Phase 1.3.1: Frontend Form Completion & Style Selection

## Overview

Phase 1.3.1 focuses on completing the wine label input form by adding the remaining essential fields (wine name and
vintage) and introducing a Style Selection System where users choose from four predefined styles (classic, modern,
elegant, funky). This phase establishes the complete frontend form structure and user interface for collecting all wine
label information.

## Objectives

1. **Complete Form Fields**: Add wine name and vintage fields to complete the essential wine label information
2. **Simple Frontend Selection**: Offer 4 distinct styles with clear descriptions and preview images
3. **Form Validation**: Implement comprehensive validation for all form fields
4. **Responsive Design**: Ensure mobile-friendly interface for all components

## Technical Requirements

### Core Technologies

- React components with TypeScript
- Vanilla Extract for styling
- React Query for API interactions
- Storybook for component documentation
- Form validation hooks

### Data Structures

```typescript
type LabelStyleId = "classic" | "modern" | "elegant" | "funky";

interface StyleOption {
  id: LabelStyleId;
  name: string;
  description: string;
  previewImage?: string;
}

interface WineFormData {
  producerName: string;
  wineName: string;
  vintage: string;
  variety: string;
  region: string;
  appellation: string;
  style: LabelStyleId;
}
```

## Frontend Components

### 1. WineNameField Component

```typescript
interface WineNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

- Text input for wine name
- Validation for required field
- Character limit (100 characters)
- Placeholder: "e.g., Grand Vin, Reserve, Estate"

### 2. VintageField Component

```typescript
interface VintageFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

- Year selector or text input
- Validation: 4-digit year format
- Range: 1900 to current year + 1
- Option for "Non-Vintage" (NV)
- Placeholder: "e.g., 2021"

### 3. StyleSelector Component

```typescript
interface StyleSelectorProps {
  selectedStyle: LabelStyleId;
  onStyleChange: (style: LabelStyleId) => void;
  disabled?: boolean;
}
```

- Card-based selection with 4 style options
- Visual preview images for each style
- Clear, descriptive names and brief descriptions

## Form Integration & Validation

### Form Validation Rules

**Wine Name Field:**

- Required field
- Min length: 2 characters
- Max length: 100 characters
- Allow letters, numbers, spaces, and common punctuation
- Trim whitespace before validation

**Vintage Field:**

- Required field
- Accept "NV" or "N.V." for non-vintage
- Year format: 4 digits (e.g., 2021)
- Range: 1900 to current year + 1
- No future years beyond next year

**Producer Name Field (existing):**

- Required field
- Min length: 2 characters
- Max length: 100 characters

**All Fields:**

- Real-time validation on blur
- Clear error messages
- Prevent form submission if any errors

### Form Submission Flow

```typescript
// Frontend submits all form data
const response = await fetch("/api/wine-labels", {
  method: "POST",
  body: JSON.stringify({
    producerName,
    wineName,
    vintage,
    variety,
    region,
    appellation,
    style: selectedStyle,
  }),
});

const { submissionId, generationId, statusUrl } = await response.json();
```

## UI/UX Specifications

### Style Selector Design

```text
┌─────────────────────────┐
│ Select Label Style      │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ CLASSIC │ │ MODERN  │ │
│ │ [image] │ │ [image] │ │
│ │ • Serif │ │ • Sans  │ │
│ │ • Center│ │ • Left  │ │
│ └─────────┘ └─────────┘ │
│ ┌─────────┐ ┌─────────┐ │
│ │ ELEGANT │ │  FUNKY  │ │
│ │ [image] │ │ [image] │ │
│ │ • Mixed │ │ • Bold  │ │
│ │ • Formal│ │ • Free  │ │
│ └─────────┘ └─────────┘ │
└─────────────────────────┘
```

### Style Characteristics

#### Classic Style

- **Typography**: Traditional serif fonts (Playfair Display, Crimson Text)
- **Layout**: Centered alignment, formal hierarchy
- **Decorative**: Subtle borders, traditional ornaments
- **Use Case**: Traditional wineries, established regions

#### Modern Style

- **Typography**: Clean sans-serif fonts (Inter, Work Sans)
- **Layout**: Left-aligned, asymmetric options
- **Decorative**: Minimal, geometric elements
- **Use Case**: Contemporary producers, urban wineries

#### Elegant Style

- **Typography**: Refined serif/sans combinations
- **Layout**: Balanced spacing, sophisticated hierarchy
- **Decorative**: Delicate flourishes, refined details
- **Use Case**: Premium wines, special editions

#### Funky Style

- **Typography**: Display fonts, bold choices
- **Layout**: Dynamic, rule-breaking layouts
- **Decorative**: Playful elements, unexpected details
- **Use Case**: Natural wines, experimental producers

## Frontend Architecture

```text
src/frontend/components/
├── WineNameField/
│   ├── index.ts
│   ├── WineNameField.tsx
│   ├── WineNameField.css.ts
│   ├── WineNameField.test.tsx
│   └── WineNameField.stories.tsx
├── VintageField/
│   ├── index.ts
│   ├── VintageField.tsx
│   ├── VintageField.css.ts
│   ├── VintageField.test.tsx
│   └── VintageField.stories.tsx
└── StyleSelector/
    ├── index.ts
    ├── StyleSelector.tsx
    ├── StyleSelector.css.ts
    ├── StyleSelector.test.tsx
    └── StyleSelector.stories.tsx

src/frontend/hooks/
├── useWineLabels.ts           // Existing hook for API
├── useWineFormValidation.ts   // Validation logic
└── useStyleSelection.ts       // Style selection state
```

## Testing Strategy

### Unit Tests

- Wine name field validation and character limits
- Vintage field validation (year format, NV option, range)
- Style selector state management
- Style application logic
- Component rendering with different styles
- Form validation with all required fields

### Integration Tests

- Complete form submission with all fields
- Form integration with style selection
- Validation errors prevent submission
- Preview updates on style change
- Style persistence across sessions
- Field data persistence during style changes

### Visual Tests

- Storybook stories for each style
- Responsive design verification
- Accessibility compliance

## Accessibility Requirements

1. **ARIA Labels**

   - Descriptive labels for style options
   - Announce style changes to screen readers

2. **Keyboard Navigation**

   - Tab through style options
   - Enter/Space to select
   - Arrow keys for navigation

3. **Visual Accessibility**
   - High contrast mode support
   - Clear focus indicators
   - Alternative text for previews

## Internationalization

1. **Translatable Content**

   - Style names and descriptions
   - UI labels and help text
   - Error messages
   - Field placeholders

2. **Supported Languages**
   - English (primary)
   - French (wine industry standard)
   - Additional languages in future phases

## Success Criteria

1. **Functional Requirements**

   - [ ] Wine name field with validation
   - [ ] Vintage field with year validation and NV option
   - [ ] All 4 styles selectable in UI
   - [ ] Complete form with all fields integrated
   - [ ] Form validation prevents invalid submissions
   - [ ] Mobile-responsive design
   - [ ] Accessible via keyboard navigation

2. **Code Quality**

   - [ ] 90%+ test coverage for components
   - [ ] All components documented in Storybook
   - [ ] TypeScript strict mode compliance
   - [ ] No accessibility violations

3. **User Experience**
   - [ ] Clear visual feedback for selections
   - [ ] Intuitive form flow
   - [ ] Helpful error messages
   - [ ] Smooth transitions and interactions

## Timeline

**Total Duration**: 5 working days

- Days 1-2: Core form field components (WineNameField, VintageField)
- Days 3-4: Style selection component and integration
- Day 5: Polish, testing, and accessibility verification

## Dependencies

### Prerequisites

- Phase 1.1: Project setup and infrastructure
- Phase 1.2: Core input form structure (ProducerNameField, etc.)

### External Dependencies

- Font loading system for style previews
- Image assets for style cards
- Validation library (if not using custom hooks)

## Next Phase

Phase 1.3.2 will implement the backend processing pipeline for generating label descriptions based on the submitted
form data.
