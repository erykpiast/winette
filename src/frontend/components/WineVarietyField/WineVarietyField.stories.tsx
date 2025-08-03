import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { WineVarietyField } from './WineVarietyField';

// Wrapper to provide i18n context
const WineVarietyFieldWithI18n = (props: Parameters<typeof WineVarietyField>[0]) => (
  <I18nProvider>
    <WineVarietyField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/WineVarietyField',
  component: WineVarietyFieldWithI18n,
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
} satisfies Meta<typeof WineVarietyFieldWithI18n>;

type Story = StoryObj<typeof WineVarietyFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default wine variety field (optional) with autocomplete from wine varieties data.',
      },
    },
  },
};

export const CabernetSauvignon: Story = {
  args: {
    value: 'Cabernet Sauvignon',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Cabernet Sauvignon selected.',
      },
    },
  },
};

export const Chardonnay: Story = {
  args: {
    value: 'Chardonnay',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Chardonnay selected.',
      },
    },
  },
};

export const PinotNoir: Story = {
  args: {
    value: 'Pinot Noir',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Pinot Noir selected.',
      },
    },
  },
};

export const SauvignonBlanc: Story = {
  args: {
    value: 'Sauvignon Blanc',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Sauvignon Blanc selected.',
      },
    },
  },
};

export const Merlot: Story = {
  args: {
    value: 'Merlot',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Merlot selected.',
      },
    },
  },
};

export const PartialInput: Story = {
  args: {
    value: 'Cab',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with partial input showing filtering behavior.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    value: 'Invalid Variety',
    error: 'Please select a valid wine variety',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field showing a validation error.',
      },
    },
  },
};

export const WhitespaceError: Story = {
  args: {
    value: '   ',
    error: 'Wine variety cannot contain only whitespace',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field showing error for whitespace-only input.',
      },
    },
  },
};

export const MaxLengthError: Story = {
  args: {
    value: 'This wine variety name is way too long and exceeds the maximum character limit allowed for this field',
    error: 'Wine variety must be no more than 100 characters long',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field showing maximum length validation error.',
      },
    },
  },
};

export const InvalidFormatError: Story = {
  args: {
    value: 'Variety123!@#',
    error: 'Wine variety can only contain letters, spaces, hyphens, and apostrophes',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field showing an invalid format error.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: 'Riesling',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled wine variety field that cannot be interacted with.',
      },
    },
  },
};

export const EmptyOptional: Story = {
  args: {
    value: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty wine variety field showing optional field indicator.',
      },
    },
  },
};

export const AccentedVariety: Story = {
  args: {
    value: 'Gewürztraminer',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with German variety containing umlaut.',
      },
    },
  },
};

export const FrenchVariety: Story = {
  args: {
    value: 'Côt',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with French variety name.',
      },
    },
  },
};

export const SpanishVariety: Story = {
  args: {
    value: 'Tempranillo',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Spanish variety name.',
      },
    },
  },
};

export const ItalianVariety: Story = {
  args: {
    value: 'Sangiovese',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with Italian variety name.',
      },
    },
  },
};

export const BlendVariety: Story = {
  args: {
    value: 'Bordeaux Blend',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with blend designation.',
      },
    },
  },
};

export const RareVariety: Story = {
  args: {
    value: 'Petit Verdot',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with less common variety.',
      },
    },
  },
};

export const FilteringDemo: Story = {
  args: {
    value: 'Pin',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates filtering behavior with partial input that could match "Pinot Noir" or "Pinot Grigio".',
      },
    },
  },
};

export const UndefinedValue: Story = {
  args: {
    value: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine variety field with undefined value (handled gracefully).',
      },
    },
  },
};
