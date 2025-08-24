import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import '../../styles/reset.css.ts';
import App from './App';

// Mock the useRandomPost hook
vi.mock('./useAppApi', () => ({
  useRandomPost: () => ({
    data: {
      id: 1,
      title: 'Test Post',
      body: 'Test post body',
      userId: 1,
    },
    refetch: vi.fn(),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{component}</I18nProvider>
    </QueryClientProvider>,
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app without loading screen', async () => {
    renderWithProviders(<App />);

    // Wait for i18n to load - check that loading screen is gone
    await waitFor(() => {
      expect(screen.queryByText('Loading translations...')).not.toBeInTheDocument();
    });

    // Verify that main app structure is present
    const headerElement = screen.getByRole('banner');
    expect(headerElement).toBeInTheDocument();

    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('shows language switcher', async () => {
    renderWithProviders(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.queryByText('Loading translations...')).not.toBeInTheDocument();
    });

    // Check for language switcher dropdown - assert using i18n key (tests use no-op t)
    const englishOption = screen.getByText('languages.en');
    expect(englishOption).toBeInTheDocument();
    const languageSelect = englishOption.closest('select');
    expect(languageSelect).toBeInTheDocument();

    // Check for language options
    expect(screen.getByText('languages.en')).toBeInTheDocument();
    expect(screen.getByText('languages.fr')).toBeInTheDocument();
  });

  it('renders all main sections', async () => {
    renderWithProviders(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.queryByText('Loading translations...')).not.toBeInTheDocument();
    });

    // Check for main structural elements
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main content
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer

    // Check that multiple buttons are present (form buttons, toggle buttons, test button)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Verify that the form element exists by looking for the form tag directly
    const formElement = document.querySelector('form');
    expect(formElement).toBeInTheDocument();
  });
});
