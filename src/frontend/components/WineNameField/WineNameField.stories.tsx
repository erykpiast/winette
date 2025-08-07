import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { WineNameField } from './WineNameField';

// Wrapper to provide i18n context
const WineNameFieldWithI18n = (props: Parameters<typeof WineNameField>[0]) => (
  <I18nProvider>
    <WineNameField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/WineNameField',
  component: WineNameFieldWithI18n,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Current field value',
    },
    onChange: {
      action: 'changed',
      description: 'Called when value changes',
    },
    onBlur: {
      action: 'blurred',
      description: 'Called when field loses focus',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the field is disabled',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character length',
    },
    showCharacterCount: {
      control: 'boolean',
      description: 'Whether to show character count',
    },
  },
  args: {
    onChange: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof WineNameFieldWithI18n>;

type Story = StoryObj<typeof WineNameFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
};

export const WithValue: Story = {
  args: {
    value: 'Grand Cru Reserve',
  },
};

export const AmericanWine: Story = {
  args: {
    value: 'Estate Selection',
  },
};

export const WithError: Story = {
  args: {
    value: 'A',
    error: 'Wine name must be at least 2 characters long',
  },
};

export const RequiredFieldError: Story = {
  args: {
    value: '',
    error: 'Wine name is required',
  },
};

export const Disabled: Story = {
  args: {
    value: 'Special Cuvée',
    disabled: true,
  },
};
