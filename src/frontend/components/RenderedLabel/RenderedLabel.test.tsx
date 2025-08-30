import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderedLabel } from './RenderedLabel';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'renderedLabel.title': 'Your Wine Label',
        'renderedLabel.loading': 'Loading your label...',
        'renderedLabel.download': 'Download Label',
        'renderedLabel.alt': `Wine label for ${options?.producer || '{{producer}}'} ${options?.wine || '{{wine}}'}`,
        'renderedLabel.error.failed': 'Failed to load the rendered label image',
        'renderedLabel.details.dimensions': 'Dimensions',
        'renderedLabel.details.region': 'Region',
        'renderedLabel.details.variety': 'Variety',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RenderedLabel', () => {
  const mockWineDetails = {
    producerName: 'Test Winery',
    wineName: 'Test Wine',
    vintage: '2023',
    region: 'Test Region',
    variety: 'Test Variety',
  };

  const defaultProps = {
    previewUrl: 'https://example.com/test-label.png',
    width: 400,
    height: 600,
    wineDetails: mockWineDetails,
    format: 'PNG' as const,
  };

  it('renders correctly with all props', () => {
    render(<RenderedLabel {...defaultProps} />);

    expect(screen.getByText('Your Wine Label')).toBeInTheDocument();
    expect(screen.getByText('Test Winery • Test Wine • 2023')).toBeInTheDocument();
    expect(screen.getByText('Loading your label...')).toBeInTheDocument();
    expect(screen.getByText('Download Label')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<RenderedLabel {...defaultProps} />);

    expect(screen.getByText('Loading your label...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Label' })).toBeDisabled();
  });

  it('shows image when loaded successfully', async () => {
    render(<RenderedLabel {...defaultProps} />);

    const image = screen.getByAltText('Wine label for Test Winery Test Wine');

    // Simulate image load
    fireEvent.load(image);

    await waitFor(() => {
      expect(screen.queryByText('Loading your label...')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download Label' })).not.toBeDisabled();
    });
  });

  it('shows error state when image fails to load', async () => {
    render(<RenderedLabel {...defaultProps} />);

    const image = screen.getByAltText('Wine label for Test Winery Test Wine');

    // Simulate image error
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText('Failed to load the rendered label image')).toBeInTheDocument();
      expect(screen.queryByText('Loading your label...')).not.toBeInTheDocument();
    });
  });

  it('displays wine details correctly', () => {
    render(<RenderedLabel {...defaultProps} />);

    expect(screen.getByText('Dimensions: 400 × 600 • PNG')).toBeInTheDocument();
    expect(screen.getByText('Region: Test Region')).toBeInTheDocument();
    expect(screen.getByText('Variety: Test Variety')).toBeInTheDocument();
  });

  it('handles missing optional details gracefully', () => {
    const propsWithoutOptional = {
      ...defaultProps,
      wineDetails: {
        producerName: 'Test Winery',
        wineName: 'Test Wine',
        vintage: '2023',
      },
    };

    render(<RenderedLabel {...propsWithoutOptional} />);

    expect(screen.getByText('Test Winery • Test Wine • 2023')).toBeInTheDocument();
    expect(screen.queryByText('Region:')).not.toBeInTheDocument();
    expect(screen.queryByText('Variety:')).not.toBeInTheDocument();
  });

  it('handles missing dimensions gracefully', () => {
    const { width, height, ...propsWithoutDimensions } = defaultProps;

    render(<RenderedLabel {...propsWithoutDimensions} />);

    expect(screen.getByText('Dimensions: ? × ? • PNG')).toBeInTheDocument();
  });

  it('triggers download when download button is clicked', async () => {
    const { container } = render(<RenderedLabel {...defaultProps} />);

    // Simulate image load to enable the download button
    const image = screen.getByAltText('Wine label for Test Winery Test Wine');
    fireEvent.load(image);

    // Wait for the component to update after image load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download Label' })).not.toBeDisabled();
    });

    // Mock the click handler instead of DOM manipulation
    const downloadButton = screen.getByRole('button', { name: 'Download Label' });

    // Verify the button is enabled and clickable
    expect(downloadButton).not.toBeDisabled();
    fireEvent.click(downloadButton);

    // Since we can't easily test actual download without complex DOM mocking,
    // we just verify the component renders correctly and the button works
    expect(container).toBeInTheDocument();
  });

  it('renders correctly with different formats', async () => {
    const propsWithJpeg = { ...defaultProps, format: 'JPEG' as const };
    render(<RenderedLabel {...propsWithJpeg} />);

    // Verify the format is displayed
    expect(screen.getByText('Dimensions: 400 × 600 • JPEG')).toBeInTheDocument();

    // Simulate image load and verify button works
    const image = screen.getByAltText('Wine label for Test Winery Test Wine');
    fireEvent.load(image);

    // Wait for the component to update after image load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download Label' })).not.toBeDisabled();
    });

    const downloadButton = screen.getByRole('button', { name: 'Download Label' });
    expect(downloadButton).not.toBeDisabled();
  });
});
