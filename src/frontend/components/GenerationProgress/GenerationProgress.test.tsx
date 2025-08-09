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
    expect(screen.getByText(/Status: initializing…/)).toBeInTheDocument();
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
    expect(screen.getByText(/Status: pending…/)).toBeInTheDocument();
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
    expect(screen.getByText(/Status: processing…/)).toBeInTheDocument();
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
            colorPalette: {
              primary: { hex: '#722F37', rgb: [114, 47, 55], name: 'Wine Red' },
              secondary: { hex: '#D4AF37', rgb: [212, 175, 55], name: 'Gold' },
              accent: { hex: '#2C3E50', rgb: [44, 62, 80], name: 'Navy' },
              background: { hex: '#F5F5DC', rgb: [245, 245, 220], name: 'Beige' },
              temperature: 'warm',
              contrast: 'high',
            },
            typography: {
              primary: {
                family: 'Playfair Display',
                weight: 700,
                style: 'normal',
                letterSpacing: 0.02,
                characteristics: ['serif'],
              },
              secondary: {
                family: 'Lato',
                weight: 400,
                style: 'normal',
                letterSpacing: 0.01,
                characteristics: ['sans-serif'],
              },
              hierarchy: {
                producerEmphasis: 'dominant',
                vintageProminence: 'standard',
                regionDisplay: 'prominent',
              },
            },
            layout: {
              alignment: 'centered',
              composition: 'classical',
              whitespace: 'generous',
              structure: 'rigid',
            },
            imagery: {
              primaryTheme: 'estate',
              elements: ['château'],
              style: 'engraving',
              complexity: 'detailed',
            },
            decorations: [],
            mood: {
              overall: 'sophisticated and traditional',
              attributes: ['luxurious'],
            },
          },
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:30:45Z',
          completedAt: '2024-01-20T14:30:45Z',
        }}
      />,
    );

    expect(screen.getByText(/generation.completedTitle/)).toBeInTheDocument();
    expect(screen.getByText(/sophisticated and traditional/)).toBeInTheDocument();
    expect(screen.getByText(/Wine Red \+ Gold/)).toBeInTheDocument();
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

    expect(screen.getByText(/Generation ID: gen_test4/)).toBeInTheDocument();
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

    const processingContainer = screen.getByText('generation.processing').closest('div');
    expect(processingContainer).toHaveAttribute('aria-busy', 'true');

    const statusText = screen.getByText('generation.processing');
    expect(statusText).toHaveAttribute('aria-live', 'polite');
  });
});
