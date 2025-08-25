import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GenerationProgressProps } from './GenerationProgress';
import { GenerationProgress } from './GenerationProgress';

const mockFormData = {
  producerName: 'Test Winery',
  wineName: 'Test Wine',
  vintage: '2023',
  wineVariety: 'Pinot Noir',
  region: 'Test Region',
  appellation: 'Test AOC',
  style: 'classic' as const,
};

const mockSubmission = {
  submissionId: 'sub_test123',
  generationId: 'gen_test456',
};

const defaultProps: GenerationProgressProps = {
  formData: mockFormData,
  submission: mockSubmission,
  onCancel: vi.fn(),
  onRestart: vi.fn(),
};

describe('GenerationProgress', () => {
  it('renders the form-like layout with values', () => {
    render(<GenerationProgress {...defaultProps} />);

    expect(screen.getByText('wineForm.title')).toBeInTheDocument();
    expect(screen.getByText('Test Winery')).toBeInTheDocument();
    expect(screen.getByText('Test Wine')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Pinot Noir')).toBeInTheDocument();
    expect(screen.getByText('Test Region')).toBeInTheDocument();
    expect(screen.getByText('Test AOC')).toBeInTheDocument();
  });

  it('shows initializing state', () => {
    render(<GenerationProgress {...defaultProps} submission={undefined} status={{ status: 'initializing' }} />);

    expect(screen.getByText('generation.initializing')).toBeInTheDocument();
    expect(screen.getByText('generation.longRunning')).toBeInTheDocument();
    expect(screen.getByText('generation.keepTabOpen')).toBeInTheDocument();
    expect(screen.getByText(/generation\.status:\s+generation\.statuses\.initializing…/)).toBeInTheDocument();
  });

  it('shows processing state when status is pending', () => {
    render(
      <GenerationProgress
        {...defaultProps}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'pending',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:00Z',
        }}
      />,
    );

    expect(screen.getByText('generation.processing')).toBeInTheDocument();
    expect(screen.getByText('generation.longRunning')).toBeInTheDocument();
    expect(screen.getByText('generation.keepTabOpen')).toBeInTheDocument();
    expect(screen.getByText(/generation\.status:\s+generation\.statuses\.pending…/)).toBeInTheDocument();
  });

  it('shows processing state when status is processing', () => {
    render(
      <GenerationProgress
        {...defaultProps}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'processing',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:15Z',
        }}
      />,
    );

    expect(screen.getByText('generation.processing')).toBeInTheDocument();
    expect(screen.getByText(/generation\.status:\s+generation\.statuses\.processing…/)).toBeInTheDocument();
  });

  it('shows completed state with description', () => {
    render(
      <GenerationProgress
        {...defaultProps}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'completed',
          description: {
            version: '1',
            canvas: {
              width: 800,
              height: 1200,
              dpi: 300,
              background: '#F5F5DC',
            },
            palette: {
              primary: '#722F37',
              secondary: '#D4AF37',
              accent: '#2C3E50',
              background: '#F5F5DC',
              temperature: 'warm',
              contrast: 'high',
            },
            typography: {
              primary: {
                family: 'Playfair Display',
                weight: 700,
                style: 'normal',
                letterSpacing: 0.02,
              },
              secondary: {
                family: 'Lato',
                weight: 400,
                style: 'normal',
                letterSpacing: 0.01,
              },
              hierarchy: {
                producerEmphasis: 'dominant',
                vintageProminence: 'standard',
                regionDisplay: 'prominent',
              },
            },
            assets: [],
            elements: [],
          },
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:45Z',
          completedAt: '2024-01-20T14:30:45Z',
        }}
      />,
    );

    expect(screen.getByText(/generation.completedTitle/)).toBeInTheDocument();
    expect(screen.getByText(/warm/)).toBeInTheDocument();
    expect(screen.getByText(/#722F37 \+ #D4AF37/)).toBeInTheDocument();
    expect(screen.getByText(/Playfair Display/)).toBeInTheDocument();
  });

  it('shows failed state with error message', () => {
    render(
      <GenerationProgress
        {...defaultProps}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'failed',
          error: 'Timeout error occurred',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:35:00Z',
        }}
      />,
    );

    expect(screen.getByText(/generation.failedTitle/)).toBeInTheDocument();
    expect(screen.getByText(/Timeout error occurred/)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <GenerationProgress
        {...defaultProps}
        onCancel={onCancel}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'processing',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:15Z',
        }}
      />,
    );

    const cancelButton = screen.getByText('generation.actions.cancel');
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when restart button is clicked', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();

    render(
      <GenerationProgress
        {...defaultProps}
        onRestart={onRestart}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'processing',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:15Z',
        }}
      />,
    );

    const restartButton = screen.getByText('generation.actions.restart');
    await user.click(restartButton);

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('shows generation ID when available', () => {
    render(<GenerationProgress {...defaultProps} />);

    const statusLine =
      document.querySelector(`.${'GenerationProgress_statusLine__10hs6hhb'}`) ??
      (screen.getByText('wineForm.title').closest('div')?.querySelector('[class*="statusLine"]') as HTMLElement | null);
    expect(statusLine?.textContent).toContain('gen_test');
  });

  it('does not show generation ID when not available', () => {
    render(<GenerationProgress {...defaultProps} submission={undefined} />);

    expect(screen.queryByText(/Generation ID:/)).not.toBeInTheDocument();
  });

  it('does not render optional fields when not provided', () => {
    const minimalFormData = {
      producerName: 'Simple Winery',
      wineName: 'House Wine',
      vintage: '2023',
      region: 'California',
      style: 'modern' as const,
    };

    render(<GenerationProgress {...defaultProps} formData={minimalFormData} />);

    expect(screen.getByText('Simple Winery')).toBeInTheDocument();
    expect(screen.queryByText('generation.fields.variety')).not.toBeInTheDocument();
    expect(screen.queryByText('generation.fields.appellation')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <GenerationProgress
        {...defaultProps}
        status={{
          id: 'gen_test456',
          submissionId: 'sub_test123',
          status: 'processing',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:15Z',
        }}
      />,
    );

    const overlay = document.querySelector('[aria-busy="true"]');
    expect(overlay).toBeInTheDocument();

    const statusText = screen.getByText('generation.processing');
    expect(statusText).toHaveAttribute('aria-live', 'polite');
  });
});
