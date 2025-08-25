# AI Label Generation Pipeline

## Overview

Winette uses a sophisticated multi-phase AI pipeline to generate wine label designs. The system transforms
high-level user input into detailed, renderable label specifications through a series of orchestrated steps.

## Pipeline Flow

```text
User Input (Wine Data + Style)
           ↓
    [Phase 1: design-scheme]
    Generate DesignSchema - high-level design decisions
    • Color palette with temperature/contrast
    • Typography selections with characteristics
    • Layout hints (alignment, composition, whitespace)
    • Imagery themes and decoration suggestions
    • Overall mood and attributes
           ↓
    [Phase 2: image-prompts]
    Create detailed image generation prompts
    • Convert design scheme into specific image descriptions
    • Generate multiple prompt variations for hero imagery
    • Define image style, complexity, and elements
           ↓
    [Phase 3: image-generate]
    Generate visual assets
    • Execute image prompts through AI image generation
    • Create multiple image variants
    • Store generated assets with metadata
           ↓
    [Phase 4: detailed-layout]
    Create LabelDSL - concrete positioning and elements
    • Transform DesignSchema into specific bounds/coordinates
    • Place text elements with precise typography settings
    • Position generated images within label canvas
    • Define shapes, decorations, and visual hierarchy
           ↓
    [Phase 5: render]
    Generate preview visualization
    • Render LabelDSL into viewable label preview
    • Apply fonts, colors, and image positioning
    • Create high-resolution output for review
           ↓
    [Phase 6: refine]
    Optional refinement and adjustments
    • AI-powered quality assessment
    • Minor positioning and styling adjustments
    • Final optimization and validation
           ↓
    Final Label Design Ready
```

## Phase Details

### Phase 1: Design Scheme

**Input:** User wine data (producer, variety, region, etc.) + selected style (classic, modern, elegant, funky)

**Output:** `DesignSchema` object containing:

- **Palette**: Primary, secondary, accent, and background colors with temperature and contrast metadata
- **Typography**: Font families, weights, and hierarchical emphasis settings
- **Layout**: Alignment, composition style, whitespace, and structural approach
- **Imagery**: Theme selection, visual elements, artistic style, and complexity level
- **Decorations**: Border/frame types, thematic elements, placement, and visual weight
- **Mood**: Overall aesthetic description and key attributes

**Purpose:** Establish the foundational design language and aesthetic direction for the label.

### Phase 2: Image Prompts

**Input:** `DesignSchema` from Phase 1

**Output:** Array of detailed image generation prompts

**Purpose:** Convert high-level imagery themes into specific, actionable prompts for AI image generation.

### Phase 3: Image Generate

**Input:** Image prompts from Phase 2

**Output:** Generated image assets with URLs and metadata

**Purpose:** Create the actual visual assets (hero images, backgrounds, decorative elements) that will be used in the
final label design.

### Phase 4: Detailed Layout

**Input:** `DesignSchema` + generated image assets

**Output:** Complete `LabelDSL` specification

**Purpose:** Transform the conceptual design into precise, pixel-perfect positioning and styling
instructions.

#### LabelDSL Structure

```typescript
interface LabelDSL {
  version: '1';
  canvas: { width: number; height: number; dpi: number; background: string };
  palette: { primary: string; secondary: string; accent: string; background: string; ... };
  typography: { primary: FontSpec; secondary: FontSpec; hierarchy: TextHierarchy };
  assets: ImageAsset[];
  elements: (TextElement | ImageElement | ShapeElement)[];
}
```

**Elements include:**

- **Text Elements**: Producer name, wine name, vintage, variety, region with precise bounds, fonts, colors, and styling
- **Image Elements**: Hero imagery, decorative graphics, backgrounds with positioning, scaling, and effects
- **Shape Elements**: Lines, rectangles, decorative borders with colors, positioning, and transformations

### Phase 5: Render

**Input:** Complete `LabelDSL`

**Output:** High-resolution label preview image

**Purpose:** Generate the final visual representation that users can review and approve.

### Phase 6: Refine

**Input:** Rendered label preview

**Output:** Refined `LabelDSL` with optimizations

**Purpose:** AI-driven quality assessment and minor adjustments for optimal visual impact.

## Data Flow

### High-Level Design (DesignSchema) → Detailed Specification (LabelDSL)

The pipeline's key innovation is the separation between conceptual design decisions and implementation details:

- **DesignSchema** captures _what_ the design should feel like
- **LabelDSL** defines _how_ to implement that feeling with specific elements

This separation allows:

1. **Design Consistency**: High-level aesthetic decisions remain coherent
2. **Flexible Implementation**: Multiple layout approaches can realize the same design concept
3. **Iterative Refinement**: Design can be adjusted at the conceptual level without rebuilding layouts
4. **Quality Validation**: Both design intent and implementation quality can be independently validated

### Pipeline State Tracking

Each generation tracks:

- **Current Phase**: Which pipeline step is active
- **Phase Outputs**: Intermediate results from each completed step
- **Error Handling**: Step-specific error capture and recovery
- **Attempt Counting**: Retry logic for failed steps

## Validation

### LLM Output Validation

All AI-generated outputs use Zod schemas for validation:

- **DesignSchemaSchema**: Validates Phase 1 AI output structure and content
- **LabelDSLSchema**: Validates Phase 4 detailed layout specification
- **Cross-validation**: Ensures generated elements reference valid assets and maintain design consistency

### Quality Assurance

- **Schema Compliance**: All generated data must pass TypeScript type checking and Zod validation
- **Design Coherence**: Color palettes maintain specified temperature and contrast levels
- **Technical Constraints**: Element positioning respects canvas bounds and visual hierarchy
- **Asset Validation**: All image references must correspond to successfully generated assets

## Error Handling

### Graceful Degradation

- **Phase Isolation**: Failures in one phase don't corrupt previous results
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Fallback Strategies**: Default values for optional elements
- **User Feedback**: Clear error messages with actionable next steps

### Recovery Mechanisms

- **Partial Results**: Users can see and utilize intermediate outputs (e.g., DesignSchema without full layout)
- **Manual Intervention**: Support for human review and adjustment at any phase
- **Alternative Paths**: Multiple generation strategies for robust output

## Performance Characteristics

### Pipeline Timing

- **Phase 1 (design-scheme)**: ~2-5 seconds
- **Phase 2 (image-prompts)**: ~1-3 seconds
- **Phase 3 (image-generate)**: ~10-30 seconds (depends on image complexity)
- **Phase 4 (detailed-layout)**: ~3-8 seconds
- **Phase 5 (render)**: ~2-5 seconds
- **Phase 6 (refine)**: ~1-3 seconds (optional)

**Total Pipeline Time**: ~19-54 seconds end-to-end

### Scalability Considerations

- **Asynchronous Processing**: Each phase runs independently with queue-based orchestration
- **Parallel Image Generation**: Multiple image variants can be generated concurrently
- **Caching Strategy**: DesignSchema results can be cached and reused for layout variations
- **Resource Management**: Pipeline steps are sized appropriately for serverless execution limits

## Future Enhancements

### Planned Improvements

- **User Feedback Integration**: Learn from user preferences to improve design quality
- **Style Transfer**: Apply successful design patterns across different wine types
- **Batch Processing**: Generate multiple label variations in parallel
- **Interactive Refinement**: Allow users to adjust DesignSchema parameters and regenerate layouts
- **Export Formats**: Support for print-ready PDF, SVG, and other professional formats

### Advanced Features

- **Brand Consistency**: Maintain visual identity across multiple wine labels for the same producer
- **Regulatory Compliance**: Ensure generated labels meet wine industry labeling requirements
- **Accessibility**: Generate designs that work across different vision capabilities
- **Internationalization**: Support for multiple languages and cultural design preferences
