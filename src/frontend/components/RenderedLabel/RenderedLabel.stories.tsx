import type { Meta, StoryObj } from '@storybook/react';
import { RenderedLabel } from './RenderedLabel';

const meta: Meta<typeof RenderedLabel> = {
  title: 'Components/RenderedLabel',
  component: RenderedLabel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays the rendered wine label image with download functionality and wine details',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    previewUrl: {
      control: { type: 'text' },
      description: 'URL of the rendered label image',
    },
    width: {
      control: { type: 'number' },
      description: 'Width of the image in pixels',
    },
    height: {
      control: { type: 'number' },
      description: 'Height of the image in pixels',
    },
    format: {
      control: { type: 'select' },
      options: ['PNG', 'JPEG', 'WebP'],
      description: 'Format of the image',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock wine label image URL (placeholder)
const mockLabelImageUrl = 'https://via.placeholder.com/400x600/8B4513/FFFFFF?text=Sample+Wine+Label';

export const Default: Story = {
  args: {
    previewUrl: mockLabelImageUrl,
    width: 400,
    height: 600,
    format: 'PNG',
    wineDetails: {
      producerName: 'Château Example',
      wineName: 'Grand Reserve',
      vintage: '2020',
      region: 'Bordeaux',
      variety: 'Cabernet Sauvignon',
    },
  },
};

export const WithoutOptionalDetails: Story = {
  args: {
    previewUrl: mockLabelImageUrl,
    width: 350,
    height: 500,
    format: 'JPEG',
    wineDetails: {
      producerName: 'Simple Winery',
      wineName: 'Basic Red',
      vintage: '2023',
    },
  },
};

export const LargeLabel: Story = {
  args: {
    previewUrl: mockLabelImageUrl,
    width: 800,
    height: 1200,
    format: 'PNG',
    wineDetails: {
      producerName: 'Premium Estate',
      wineName: 'Heritage Collection Pinot Noir',
      vintage: '2019',
      region: 'Burgundy',
      variety: 'Pinot Noir',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const WebPFormat: Story = {
  args: {
    previewUrl: mockLabelImageUrl,
    width: 450,
    height: 650,
    format: 'WebP',
    wineDetails: {
      producerName: 'Modern Vintners',
      wineName: 'Innovation Series',
      vintage: '2022',
      region: 'California',
      variety: 'Blend',
    },
  },
};

export const LoadingState: Story = {
  args: {
    previewUrl: '', // Empty URL to simulate loading/error
    wineDetails: {
      producerName: 'Loading Winery',
      wineName: 'Loading Label',
      vintage: '2023',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading state when the image is being loaded',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    previewUrl: 'https://invalid-url-that-will-fail.example.com/nonexistent.jpg',
    wineDetails: {
      producerName: 'Error Winery',
      wineName: 'Failed Label',
      vintage: '2023',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the error state when the image fails to load',
      },
    },
  },
};
