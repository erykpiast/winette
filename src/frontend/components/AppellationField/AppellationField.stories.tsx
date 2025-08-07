import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { AppellationField } from './AppellationField';

// Wrapper to provide i18n context
const AppellationFieldWithI18n = (props: Parameters<typeof AppellationField>[0]) => (
  <I18nProvider>
    <AppellationField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/AppellationField',
  component: AppellationFieldWithI18n,
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
} satisfies Meta<typeof AppellationFieldWithI18n>;

type Story = StoryObj<typeof AppellationFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
};

export const FrenchAppellation: Story = {
  args: {
    value: 'Côtes du Rhône',
  },
};

export const AmericanAVA: Story = {
  args: {
    value: 'Napa Valley',
  },
};

export const ItalianDOC: Story = {
  args: {
    value: 'Chianti Classico',
  },
};

export const WithError: Story = {
  args: {
    value: 'Invalid@Appellation',
    error: 'Appellation contains invalid characters',
  },
};

export const Disabled: Story = {
  args: {
    value: 'Burgundy',
    disabled: true,
  },
};
