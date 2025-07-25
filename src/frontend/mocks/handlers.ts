import { HttpResponse, http } from 'msw';

// Define types directly to avoid import issues
type WineStyle = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert';

interface WineLabel {
  id: string;
  name: string;
  winery: string;
  vintage: number;
  region: string;
  grape_variety: string;
  alcohol_content: number;
  tasting_notes: string;
  style: WineStyle;
  created_at: string;
  updated_at: string;
}

interface CreateWineLabelRequest {
  name: string;
  winery: string;
  vintage: number;
  region: string;
  grape_variety: string;
  alcohol_content: number;
  tasting_notes: string;
  style: WineStyle;
}

interface UpdateWineLabelRequest {
  name?: string;
  winery?: string;
  vintage?: number;
  region?: string;
  grape_variety?: string;
  alcohol_content?: number;
  tasting_notes?: string;
  style?: WineStyle;
}

// Mock wine labels data
const mockWineLabels: WineLabel[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Château Margaux 2015',
    winery: 'Château Margaux',
    vintage: 2015,
    region: 'Bordeaux, France',
    grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc',
    alcohol_content: 13.5,
    tasting_notes: 'Elegant and refined with notes of blackcurrant, cedar, and subtle spices. Long, complex finish.',
    style: 'red' as WineStyle,
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Dom Pérignon 2012',
    winery: 'Moët & Chandon',
    vintage: 2012,
    region: 'Champagne, France',
    grape_variety: 'Chardonnay, Pinot Noir',
    alcohol_content: 12.5,
    tasting_notes:
      'Crisp and effervescent with citrus and white flower aromas. Perfect balance of acidity and richness.',
    style: 'sparkling' as WineStyle,
    created_at: '2023-02-20T14:15:00Z',
    updated_at: '2023-02-20T14:15:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Opus One 2018',
    winery: 'Opus One Winery',
    vintage: 2018,
    region: 'Napa Valley, California',
    grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc, Malbec',
    alcohol_content: 14.5,
    tasting_notes: 'Bold and structured with dark fruit flavors, vanilla, and oak. Full-bodied with smooth tannins.',
    style: 'red' as WineStyle,
    created_at: '2023-03-10T09:45:00Z',
    updated_at: '2023-03-10T09:45:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Sancerre Les Monts Damnés 2020',
    winery: 'Henri Bourgeois',
    vintage: 2020,
    region: 'Loire Valley, France',
    grape_variety: 'Sauvignon Blanc',
    alcohol_content: 13.0,
    tasting_notes: 'Fresh and mineral with gooseberry and citrus notes. Crisp acidity with a clean, dry finish.',
    style: 'white' as WineStyle,
    created_at: '2023-04-05T16:20:00Z',
    updated_at: '2023-04-05T16:20:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Château de Beaucastel Rosé 2021',
    winery: 'Château de Beaucastel',
    vintage: 2021,
    region: 'Rhône Valley, France',
    grape_variety: 'Grenache, Cinsault, Syrah',
    alcohol_content: 13.5,
    tasting_notes: 'Delicate pink color with strawberry and peach aromas. Fresh and vibrant with a silky texture.',
    style: 'rosé' as WineStyle,
    created_at: '2023-05-12T11:10:00Z',
    updated_at: '2023-05-12T11:10:00Z',
  },
];

export const handlers = [
  // Health check
  http.get('/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'mocked',
    });
  }),

  // Get wine labels
  http.get('/api/wine-labels', ({ request }) => {
    const url = new URL(request.url);
    const style = url.searchParams.get('style') as WineStyle | null;
    const region = url.searchParams.get('region');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let filteredLabels = [...mockWineLabels];

    // Filter by style
    if (style) {
      filteredLabels = filteredLabels.filter((label) => label.style === style);
    }

    // Filter by region (partial match)
    if (region) {
      filteredLabels = filteredLabels.filter((label) => label.region.toLowerCase().includes(region.toLowerCase()));
    }

    // Apply pagination
    const total = filteredLabels.length;
    // If offset is beyond available data, cycle back to the beginning
    const adjustedOffset = total > 0 ? offset % total : 0;
    const paginatedLabels = filteredLabels.slice(adjustedOffset, adjustedOffset + limit);
    const hasMore = adjustedOffset + limit < total;

    return HttpResponse.json({
      success: true,
      data: paginatedLabels,
      total,
      hasMore,
      cached: false,
    });
  }),

  // Get wine label by ID
  http.get('/api/wine-labels/:id', ({ params }) => {
    const { id } = params;
    const wineLabel = mockWineLabels.find((label) => label.id === id);

    if (!wineLabel) {
      return HttpResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Wine label not found',
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: wineLabel,
      cached: false,
    });
  }),

  // Create wine label
  http.post('/api/wine-labels', async ({ request }) => {
    const body = (await request.json()) as CreateWineLabelRequest;

    const newWineLabel: WineLabel = {
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to mock data (in real app, this would persist)
    mockWineLabels.push(newWineLabel);

    return HttpResponse.json(
      {
        success: true,
        data: newWineLabel,
      },
      { status: 201 },
    );
  }),

  // Update wine label
  http.put('/api/wine-labels/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = (await request.json()) as UpdateWineLabelRequest;

    const labelIndex = mockWineLabels.findIndex((label) => label.id === id);

    if (labelIndex === -1) {
      return HttpResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Wine label not found',
        },
        { status: 404 },
      );
    }

    const updatedLabel = {
      ...mockWineLabels[labelIndex],
      updated_at: new Date().toISOString(),
    } as WineLabel;

    // Update only provided fields
    if (updates.name !== undefined) updatedLabel.name = updates.name;
    if (updates.winery !== undefined) updatedLabel.winery = updates.winery;
    if (updates.vintage !== undefined) updatedLabel.vintage = updates.vintage;
    if (updates.region !== undefined) updatedLabel.region = updates.region;
    if (updates.grape_variety !== undefined) updatedLabel.grape_variety = updates.grape_variety;
    if (updates.alcohol_content !== undefined) updatedLabel.alcohol_content = updates.alcohol_content;
    if (updates.tasting_notes !== undefined) updatedLabel.tasting_notes = updates.tasting_notes;
    if (updates.style !== undefined) updatedLabel.style = updates.style;

    mockWineLabels[labelIndex] = updatedLabel;

    return HttpResponse.json({
      success: true,
      data: updatedLabel,
    });
  }),

  // Delete wine label
  http.delete('/api/wine-labels/:id', ({ params }) => {
    const { id } = params;
    const labelIndex = mockWineLabels.findIndex((label) => label.id === id);

    if (labelIndex === -1) {
      return HttpResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Wine label not found',
        },
        { status: 404 },
      );
    }

    mockWineLabels.splice(labelIndex, 1);

    return HttpResponse.json({
      success: true,
      message: 'Wine label deleted successfully',
    });
  }),

  // Rate limit error example (uncomment to test)
  // http.get('/api/wine-labels', () => {
  //   return HttpResponse.json(
  //     {
  //       error: 'RATE_LIMIT_EXCEEDED',
  //       message: 'Too many requests. Please try again later.',
  //       retryAfter: 60,
  //     },
  //     { status: 429 }
  //   );
  // }),
];
