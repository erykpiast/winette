/**
 * Semantic Element ID Mappings
 *
 * Maps semantic element IDs (commonly used by LLMs) to actual DSL element IDs.
 * This configuration centralizes the mapping logic and makes it easier to
 * maintain and update across the codebase.
 */

export const SEMANTIC_ELEMENT_MAPPINGS: Record<string, string[]> = {
  // Year/vintage variations
  'year-text': ['vintage_text', 'vintage'],
  'vintage-text': ['vintage_text', 'vintage'],
  year: ['vintage_text', 'vintage'],

  // Specific year patterns (common vintages)
  '2021-text': ['vintage_text', 'vintage'],
  '2022-text': ['vintage_text', 'vintage'],
  '2023-text': ['vintage_text', 'vintage'],
  '2020-text': ['vintage_text', 'vintage'],
  '2019-text': ['vintage_text', 'vintage'],
  '2018-text': ['vintage_text', 'vintage'],

  // Producer/winery variations
  'winery-name': ['producer_text', 'producer'],
  'producer-name': ['producer_text', 'producer'],
  winery: ['producer_text', 'producer'],
  producer: ['producer_text', 'producer'],
  'producer-text': ['producer_text', 'producer'],
  'winery-text': ['producer_text', 'producer'],

  // Wine name variations
  'wine-name': ['wine_name_text', 'wine-name'],
  'wine-title': ['wine_name_text', 'wine-name'],
  'wine-label': ['wine_name_text', 'wine-name'],
  'wine-name-text': ['wine_name_text', 'wine-name'],

  // Region/location variations
  'region-text': ['region_text', 'region'],
  'appellation-text': ['region_text', 'region'],
  appellation: ['region_text', 'region'],
  location: ['region_text', 'region'],
  'ava-text': ['region_text', 'region'],
  'valley-text': ['region_text', 'region'],

  // Specific region patterns (common AVAs and regions)
  'napa-valley-ava-text': ['region_text', 'region'],
  'napa-valley-text': ['region_text', 'region'],
  'sonoma-county-text': ['region_text', 'region'],
  'paso-robles-text': ['region_text', 'region'],
  'santa-barbara-text': ['region_text', 'region'],
  'willamette-valley-text': ['region_text', 'region'],

  // Variety variations
  'variety-text': ['variety_text', 'variety'],
  'grape-variety': ['variety_text', 'variety'],
  'wine-type': ['variety_text', 'variety'],
};

/**
 * Reverse mapping from actual DSL element IDs to semantic concepts
 * Useful for generating hints in error messages or documentation
 */
export const ACTUAL_TO_SEMANTIC_MAPPINGS: Record<string, string[]> = {
  vintage_text: ['year-text', 'vintage-text', 'year', '2021-text', '2022-text', '2023-text'],
  vintage: ['year-text', 'vintage-text', 'year'],
  producer_text: ['winery-name', 'producer-name', 'winery', 'producer', 'producer-text', 'winery-text'],
  producer: ['winery-name', 'producer-name', 'winery', 'producer'],
  wine_name_text: ['wine-name', 'wine-title', 'wine-label', 'wine-name-text'],
  'wine-name': ['wine-name', 'wine-title', 'wine-label'],
  region_text: [
    'region-text',
    'appellation-text',
    'appellation',
    'location',
    'ava-text',
    'valley-text',
    'napa-valley-ava-text',
  ],
  region: ['region-text', 'appellation-text', 'appellation', 'location'],
  variety_text: ['variety-text', 'grape-variety', 'wine-type'],
  variety: ['variety-text', 'grape-variety', 'wine-type'],
};

/**
 * Common text patterns for fuzzy matching elements by content
 */
export const FUZZY_MATCHING_PATTERNS = {
  vintage: {
    regex: /^(19|20)\d{2}$/,
    description: '4-digit year pattern (1900-2099)',
  },
  producer: {
    regex: /château|domaine|estate|winery|vineyard|cellars|wines|family|brothers|sons|daughters/i,
    description: 'Producer/winery keywords',
  },
  region: {
    regex:
      /valley|county|appellation|region|terroir|vineyard|ava|hills|mountains|coast|creek|ranch|napa|sonoma|paso|santa|willamette/i,
    description: 'Geographic/terroir/AVA keywords',
  },
  variety: {
    regex:
      /cabernet|chardonnay|merlot|pinot|sauvignon|shiraz|riesling|malbec|syrah|grenache|tempranillo|sangiovese|zinfandel|petit|verdot/i,
    description: 'Common grape variety names',
  },
} as const;
