import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, HttpResponse, http } from 'msw';

import { I18nProvider } from '#components/I18nProvider';
import App from './App';

// Create QueryClient with Storybook-friendly settings
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed requests in Storybook
        staleTime: 0, // Always fresh for Storybook
        gcTime: 0, // Don't cache for Storybook
        refetchOnMount: true,
        refetchOnWindowFocus: false,
      },
    },
  });

// Wrapper to provide i18n and QueryClient context
const AppWithProviders = () => (
  <QueryClientProvider client={createQueryClient()}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </QueryClientProvider>
);

export default {
  title: 'Pages/App',
  component: AppWithProviders,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AppWithProviders>;

type Story = StoryObj<typeof AppWithProviders>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The default app state with mock wine labels data from MSW.',
      },
    },
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', async () => {
          await delay('infinite'); // This will keep loading indefinitely
        }),
      ],
    },
    docs: {
      description: {
        story: 'Shows the loading state when the API request is pending.',
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
              message: 'Something went wrong on the server',
            },
            { status: 500 },
          );
        }),
      ],
    },
    docs: {
      description: {
        story: 'Shows how the app handles API errors.',
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
        story: 'Shows how the app handles rate limiting errors.',
      },
    },
  },
};

export const EmptyState: Story = {
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
        story: 'Shows the app when no wine labels are available.',
      },
    },
  },
};

export const FilteredByRedWines: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/wine-labels', () => {
          const redWines = [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Château Margaux 2015',
              winery: 'Château Margaux',
              vintage: 2015,
              region: 'Bordeaux, France',
              grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc',
              alcohol_content: 13.5,
              tasting_notes: 'Elegant and refined with notes of blackcurrant, cedar, and subtle spices.',
              style: 'red',
              created_at: '2023-01-15T10:30:00Z',
              updated_at: '2023-01-15T10:30:00Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440003',
              name: 'Opus One 2018',
              winery: 'Opus One Winery',
              vintage: 2018,
              region: 'Napa Valley, California',
              grape_variety: 'Cabernet Sauvignon, Merlot, Petit Verdot, Cabernet Franc, Malbec',
              alcohol_content: 14.5,
              tasting_notes: 'Bold and structured with dark fruit flavors, vanilla, and oak.',
              style: 'red',
              created_at: '2023-03-10T09:45:00Z',
              updated_at: '2023-03-10T09:45:00Z',
            },
          ];

          return HttpResponse.json({
            success: true,
            data: redWines,
            total: redWines.length,
            hasMore: false,
            cached: false,
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Shows the app with filtered results (red wines only).',
      },
    },
  },
};
