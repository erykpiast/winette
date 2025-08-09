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
            characteristics: ['serif', 'traditional', 'elegant'],
          },
          secondary: {
            family: 'Lato',
            weight: 400,
            style: 'normal',
            letterSpacing: 0.01,
            characteristics: ['sans-serif', 'clean', 'modern'],
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
          elements: ['château', 'vineyard rows', 'oak barrels'],
          style: 'engraving',
          complexity: 'detailed',
        },
        decorations: [
          {
            type: 'border',
            theme: 'vine-scroll',
            placement: 'full',
            weight: 'delicate',
          },
        ],
        mood: {
          overall: 'sophisticated and traditional',
          attributes: ['luxurious', 'established', 'prestigious'],
        },
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
