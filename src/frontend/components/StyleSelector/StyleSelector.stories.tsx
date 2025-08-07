import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import type { LabelStyleId } from '#hooks/useWineFormValidation';
import { StyleSelector } from './StyleSelector';

// Wrapper to provide i18n context
const StyleSelectorWithI18n = (props: Parameters<typeof StyleSelector>[0]) => (
  <I18nProvider>
    <StyleSelector {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/StyleSelector',
  component: StyleSelectorWithI18n,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedStyle: {
      control: 'select',
      options: ['classic', 'modern', 'elegant', 'funky'] as LabelStyleId[],
      description: 'Currently selected style',
    },
    onStyleChange: {
      action: 'styleChanged',
      description: 'Called when style selection changes',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the selector is disabled',
    },
  },
  args: {
    onStyleChange: () => {},
  },
} satisfies Meta<typeof StyleSelectorWithI18n>;

type Story = StoryObj<typeof StyleSelectorWithI18n>;

export const Default: Story = {
  args: {
    selectedStyle: 'classic',
  },
};

export const ModernSelected: Story = {
  args: {
    selectedStyle: 'modern',
  },
};

export const ElegantSelected: Story = {
  args: {
    selectedStyle: 'elegant',
  },
};

export const FunkySelected: Story = {
  args: {
    selectedStyle: 'funky',
  },
};

export const WithError: Story = {
  args: {
    selectedStyle: 'classic',
    error: 'Please select a style',
  },
};

export const Disabled: Story = {
  args: {
    selectedStyle: 'modern',
    disabled: true,
  },
};
