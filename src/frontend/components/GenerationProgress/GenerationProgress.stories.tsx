import type { Meta, StoryObj } from '@storybook/react';
import { GenerationProgress } from './GenerationProgress';

const meta = {
  title: 'Components/GenerationProgress',
  component: GenerationProgress,
  parameters: {
    layout: 'padded',
  },
  args: {
    onCancel: () => console.log('cancel'),
    onRestart: () => console.log('restart'),
  },
  argTypes: {
    onCancel: { action: 'cancel' },
    onRestart: { action: 'restart' },
  },
} satisfies Meta<typeof GenerationProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFormData = {
  producerName: 'Château Margaux',
  wineName: 'Grand Vin',
  vintage: '2018',
  wineVariety: 'Cabernet Sauvignon',
  region: 'Bordeaux',
  appellation: 'Margaux AOC',
  style: 'classic' as const,
};

const mockSubmission = {
  submissionId: 'sub_123456789',
  generationId: 'gen_987654321',
};

export const Initializing: Story = {
  args: {
    formData: mockFormData,
    submission: undefined, // No IDs yet
    status: { status: 'initializing' },
  },
};

export const Processing: Story = {
  args: {
    formData: mockFormData,
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
      status: 'processing',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:15Z',
    },
  },
};

export const Pending: Story = {
  args: {
    formData: mockFormData,
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
      status: 'pending',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
  },
};

export const Completed: Story = {
  args: {
    formData: mockFormData,
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
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
        elements: [
          {
            id: 'producer',
            type: 'text',
            text: 'Château Margaux',
            bounds: { x: 0.5, y: 0.25, w: 0.75, h: 0.067 },
            z: 1,
            font: 'primary',
            color: 'primary',
            align: 'center',
            fontSize: 48,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'none',
          },
          {
            id: 'wine',
            type: 'text',
            text: 'Grand Vin',
            bounds: { x: 0.5, y: 0.33, w: 0.5, h: 0.05 },
            z: 1,
            font: 'secondary',
            color: 'primary',
            align: 'center',
            fontSize: 32,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'none',
          },
          {
            id: 'vintage',
            type: 'text',
            text: '2018',
            bounds: { x: 0.5, y: 0.4, w: 0.25, h: 0.05 },
            z: 1,
            font: 'primary',
            color: 'secondary',
            align: 'center',
            fontSize: 36,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'none',
          },
        ],
      },
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:45Z',
      completedAt: '2024-01-20T14:30:45Z',
    },
  },
};

export const Failed: Story = {
  args: {
    formData: mockFormData,
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
      status: 'failed',
      error: 'Failed to generate description: timeout',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:35:00Z',
    },
  },
};

export const MinimalFormData: Story = {
  args: {
    formData: {
      producerName: 'Simple Winery',
      wineName: 'House Wine',
      vintage: '2023',
      region: 'California',
      style: 'modern' as const,
    },
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
      status: 'processing',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:15Z',
    },
  },
};

export const TestRetryVariety: Story = {
  args: {
    formData: {
      ...mockFormData,
      wineVariety: 'TEST_RETRY',
    },
    submission: mockSubmission,
    status: {
      id: 'gen_987654321',
      submissionId: 'sub_123456789',
      status: 'processing',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:15Z',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Special test variety that triggers retry behavior in the backend',
      },
    },
  },
};
