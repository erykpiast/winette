import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, HttpResponse, http } from 'msw';
import { Suspense } from 'react';
import { I18nProvider } from '#components/I18nProvider';
import { BackendTestSection } from './BackendTestSection';

// Create QueryClient with Storybook-friendly settings
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
      },
    },
  });

// Mock wine label data
const mockWineLabels = {
  bordeaux: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Château Margaux 2015',
    winery: 'Château Margaux',
    vintage: 2015,
    region: 'Bordeaux, France',
    grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc',
    alcohol_content: 13.5,
    tasting_notes: 'Elegant and refined with notes of blackcurrant, cedar, and subtle spices.',
    style: 'Red',
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
  },
  champagne: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Dom Pérignon 2012',
    winery: 'Moët & Chandon',
    vintage: 2012,
    region: 'Champagne, France',
    grape_variety: 'Chardonnay, Pinot Noir',
    alcohol_content: 12.5,
    tasting_notes: 'Crisp and elegant with notes of citrus, brioche, and fine bubbles.',
    style: 'Sparkling',
    created_at: '2023-02-20T14:15:00Z',
    updated_at: '2023-02-20T14:15:00Z',
  },
  napa: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Opus One 2018',
    winery: 'Opus One Winery',
    vintage: 2018,
    region: 'Napa Valley, California',
    grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc, Malbec',
    alcohol_content: 14.5,
    tasting_notes: 'Bold and structured with dark fruit flavors, vanilla, and oak.',
    style: 'Red',
    created_at: '2023-03-10T09:45:00Z',
    updated_at: '2023-03-10T09:45:00Z',
  },
  burgundy: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Domaine de la Romanée-Conti Montrachet 2019',
    winery: 'Domaine de la Romanée-Conti',
    vintage: 2019,
    region: 'Burgundy, France',
    grape_variety: 'Chardonnay',
    alcohol_content: 13.0,
    tasting_notes: 'Exceptional complexity with mineral notes, white flowers, and citrus.',
    style: 'White',
    created_at: '2023-04-05T11:20:00Z',
    updated_at: '2023-04-05T11:20:00Z',
  },
};

// Wrapper to provide all necessary contexts
const BackendTestSectionWithProviders = () => (
  <QueryClientProvider client={createQueryClient()}>
    <I18nProvider>
      <Suspense fallback={<div>Loading wine data...</div>}>
        <BackendTestSection />
      </Suspense>
    </I18nProvider>
  </QueryClientProvider>
);

export default {
  title: 'Components/BackendTestSection',
  component: BackendTestSectionWithProviders,
  parameters: {
    layout: 'padded',
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.bordeaux],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BackendTestSectionWithProviders>;

type Story = StoryObj<typeof BackendTestSectionWithProviders>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default backend test section displaying wine label data from the API.',
      },
    },
  },
};

export const BordeauxWine: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.bordeaux],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section displaying a premium Bordeaux wine.',
      },
    },
  },
};

export const ChampagneWine: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.champagne],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section displaying a prestigious Champagne.',
      },
    },
  },
};

export const NapaValleyWine: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.napa],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section displaying a California Napa Valley wine.',
      },
    },
  },
};

export const BurgundyWine: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.burgundy],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section displaying a rare white Burgundy.',
      },
    },
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', async () => {
          await delay('infinite');
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section in loading state while fetching wine data.',
      },
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json(
            {
              error: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch wine labels',
            },
            { status: 500 },
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section handling API error gracefully.',
      },
    },
  },
};

export const NetworkError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.error();
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section handling network connectivity issues.',
      },
    },
  },
};

export const RateLimitError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json(
            {
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              retryAfter: 60,
            },
            { status: 429 },
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section handling rate limit errors.',
      },
    },
  },
};

export const EmptyResponse: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
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
    docs: {
      description: {
        story: 'Backend test section handling empty data response.',
      },
    },
  },
};

export const CachedResponse: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.bordeaux],
            total: 1,
            hasMore: false,
            cached: true,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section displaying cached wine data.',
      },
    },
  },
};

export const SlowResponse: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', async () => {
          await delay(2000); // 2 second delay
          return HttpResponse.json({
            success: true,
            data: [mockWineLabels.bordeaux],
            total: 1,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Backend test section with slow API response simulation.',
      },
    },
  },
};
