import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { ProducerNameField } from './ProducerNameField';

// Wrapper to provide i18n context
const ProducerNameFieldWithI18n = (props: Parameters<typeof ProducerNameField>[0]) => (
  <I18nProvider>
    <ProducerNameField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/ProducerNameField',
  component: ProducerNameFieldWithI18n,
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
} satisfies Meta<typeof ProducerNameFieldWithI18n>;

type Story = StoryObj<typeof ProducerNameFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default producer name field with character count and validation.',
      },
    },
  },
};

export const WithValue: Story = {
  args: {
    value: 'Château Margaux',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with a French château name.',
      },
    },
  },
};

export const AmericanWinery: Story = {
  args: {
    value: 'Opus One Winery',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with an American winery name.',
      },
    },
  },
};

export const ItalianProducer: Story = {
  args: {
    value: 'Antinori',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with an Italian producer name.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    value: 'A',
    error: 'Producer name must be at least 2 characters long',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field showing a validation error for minimum length.',
      },
    },
  },
};

export const RequiredFieldError: Story = {
  args: {
    value: '',
    error: 'Producer name is required',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field showing a required field error.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: 'Dom Pérignon',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled producer name field that cannot be edited.',
      },
    },
  },
};

export const NearMaxLength: Story = {
  args: {
    value: 'Bodega Catena Zapata Family Estate Reserve Malbec Vineyard Selection Premium Collection',
    maxLength: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with a long name approaching the character limit.',
      },
    },
  },
};

export const AtMaxLength: Story = {
  args: {
    value: 'This is exactly one hundred characters long for demonstration purposes of max length limit',
    maxLength: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field at exactly the maximum character limit.',
      },
    },
  },
};

export const OverMaxLength: Story = {
  args: {
    value: 'This producer name is intentionally too long to demonstrate the over-limit styling and validation behavior',
    maxLength: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field exceeding the maximum character limit with over-limit styling.',
      },
    },
  },
};

export const HiddenCharacterCount: Story = {
  args: {
    value: 'Moët & Chandon',
    showCharacterCount: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with character count display hidden.',
      },
    },
  },
};

export const CustomMaxLength: Story = {
  args: {
    value: 'Short Name',
    maxLength: 50,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with a custom maximum character length of 50.',
      },
    },
  },
};

export const AccentedCharacters: Story = {
  args: {
    value: "Château d'Yquem & Fils",
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with accented characters and special punctuation.',
      },
    },
  },
};

export const CompanyWithNumbers: Story = {
  args: {
    value: 'Winery 123 & Sons, LLC',
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field with numbers and business entity suffixes.',
      },
    },
  },
};

export const ErrorWithCharacterCount: Story = {
  args: {
    value: 'Invalid@Producer#Name',
    error: 'Producer name contains invalid characters',
    maxLength: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Producer name field showing both error message and character count.',
      },
    },
  },
};
