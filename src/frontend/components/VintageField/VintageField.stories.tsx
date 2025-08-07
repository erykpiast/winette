import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { VintageField } from './VintageField';

// Wrapper to provide i18n context
const VintageFieldWithI18n = (props: Parameters<typeof VintageField>[0]) => (
  <I18nProvider>
    <VintageField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/VintageField',
  component: VintageFieldWithI18n,
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
  },
  args: {
    onChange: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof VintageFieldWithI18n>;

type Story = StoryObj<typeof VintageFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
};

export const WithYear: Story = {
  args: {
    value: '2021',
  },
};

export const NonVintage: Story = {
  args: {
    value: 'NV',
  },
};

export const NonVintageWithPeriods: Story = {
  args: {
    value: 'N.V.',
  },
};

export const WithError: Story = {
  args: {
    value: '1850',
    error: 'Year must be between 1900 and 2026',
  },
};

export const InvalidFormat: Story = {
  args: {
    value: 'abc',
    error: 'Invalid vintage format',
  },
};

export const Disabled: Story = {
  args: {
    value: '2020',
    disabled: true,
  },
};
