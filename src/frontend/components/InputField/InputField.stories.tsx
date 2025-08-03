import type { Meta, StoryObj } from '@storybook/react';
import { InputField } from './InputField';

export default {
  title: 'Components/InputField',
  component: InputField,
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
    label: {
      control: 'text',
      description: 'Field label text',
    },
    required: {
      control: 'boolean',
      description: 'Whether the field is required',
    },
    optional: {
      control: 'text',
      description: 'Optional text to display (e.g., "(optional)")',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the field is disabled',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'tel', 'url'],
      description: 'Input type',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character length',
    },
    showCharacterCount: {
      control: 'boolean',
      description: 'Show character count',
    },
  },
  args: {
    onChange: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof InputField>;

type Story = StoryObj<typeof InputField>;

export const Default: Story = {
  args: {
    value: '',
    label: 'Full Name',
    placeholder: 'Enter your full name',
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic input field with label and placeholder.',
      },
    },
  },
};

export const WithValue: Story = {
  args: {
    value: 'John Doe',
    label: 'Full Name',
    placeholder: 'Enter your full name',
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field with a pre-filled value.',
      },
    },
  },
};

export const Required: Story = {
  args: {
    value: '',
    label: 'Email Address',
    placeholder: 'Enter your email',
    required: true,
    type: 'email',
  },
  parameters: {
    docs: {
      description: {
        story: 'Required field with an asterisk indicator.',
      },
    },
  },
};

export const Optional: Story = {
  args: {
    value: '',
    label: 'Middle Name',
    placeholder: 'Enter your middle name',
    optional: '(optional)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Optional field with optional text indicator.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    value: 'invalid-email',
    label: 'Email Address',
    placeholder: 'Enter your email',
    error: 'Please enter a valid email address',
    type: 'email',
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field displaying a validation error.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: 'Read only value',
    label: 'Account ID',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled input field that cannot be edited.',
      },
    },
  },
};

export const WithCharacterCount: Story = {
  args: {
    value: 'Hello world',
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    maxLength: 100,
    showCharacterCount: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field with character count display.',
      },
    },
  },
};

export const OverCharacterLimit: Story = {
  args: {
    value: 'This is a very long text that exceeds the maximum character limit',
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    maxLength: 50,
    showCharacterCount: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field showing over-limit character count styling.',
      },
    },
  },
};

export const Password: Story = {
  args: {
    value: 'secretpassword',
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    required: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Password input field with masked characters.',
      },
    },
  },
};

export const Telephone: Story = {
  args: {
    value: '+1 (555) 123-4567',
    label: 'Phone Number',
    placeholder: 'Enter your phone number',
    type: 'tel',
  },
  parameters: {
    docs: {
      description: {
        story: 'Telephone input field with phone number formatting.',
      },
    },
  },
};

export const URL: Story = {
  args: {
    value: 'https://example.com',
    label: 'Website',
    placeholder: 'Enter your website URL',
    type: 'url',
  },
  parameters: {
    docs: {
      description: {
        story: 'URL input field for web addresses.',
      },
    },
  },
};

export const WithSuffix: Story = {
  args: {
    value: 'user123',
    label: 'Username',
    placeholder: 'Enter username',
    inputSuffix: (
      <button type="button" style={{ marginLeft: '8px', padding: '4px 8px' }}>
        Check
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field with a suffix element (button, icon, etc.).',
      },
    },
  },
};

export const WithBottomContent: Story = {
  args: {
    value: '',
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    bottomContent: (
      <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>Must be at least 8 characters long</div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field with additional content below the input.',
      },
    },
  },
};

export const ErrorWithCharacterCount: Story = {
  args: {
    value: 'This text has an error and shows character count',
    label: 'Description',
    placeholder: 'Enter description',
    error: 'Description contains invalid characters',
    maxLength: 100,
    showCharacterCount: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Input field showing both error message and character count.',
      },
    },
  },
};
