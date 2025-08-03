import type { Meta, StoryObj } from '@storybook/react';
import { ValidationError } from './ValidationError';

export default {
  title: 'Components/ValidationError',
  component: ValidationError,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Error message to display',
    },
    fieldId: {
      control: 'text',
      description: 'ID of the field this error is associated with (for accessibility)',
    },
    className: {
      control: 'text',
      description: 'Additional CSS class name',
    },
  },
} satisfies Meta<typeof ValidationError>;

type Story = StoryObj<typeof ValidationError>;

export const Default: Story = {
  args: {
    message: 'This field is required',
    fieldId: 'example-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic validation error message with the default styling.',
      },
    },
  },
};

export const RequiredField: Story = {
  args: {
    message: 'This field is required',
    fieldId: 'required-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'Common validation error for required fields.',
      },
    },
  },
};

export const MinLength: Story = {
  args: {
    message: 'Must be at least 2 characters long',
    fieldId: 'min-length-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'Validation error for minimum length requirement.',
      },
    },
  },
};

export const MaxLength: Story = {
  args: {
    message: 'Must be no more than 100 characters long',
    fieldId: 'max-length-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'Validation error for maximum length requirement.',
      },
    },
  },
};

export const InvalidFormat: Story = {
  args: {
    message: 'Please use only letters, spaces, hyphens, and apostrophes',
    fieldId: 'format-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'Validation error for invalid format or pattern.',
      },
    },
  },
};

export const CustomClass: Story = {
  args: {
    message: 'Custom styled error message',
    fieldId: 'custom-field',
    className: 'custom-error-style',
  },
  parameters: {
    docs: {
      description: {
        story: 'ValidationError with a custom CSS class applied.',
      },
    },
  },
};

export const LongMessage: Story = {
  args: {
    message:
      'This is a very long error message that demonstrates how the component handles text wrapping and maintains proper spacing and accessibility even with longer content.',
    fieldId: 'long-message-field',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how the component handles longer error messages.',
      },
    },
  },
};
