import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { RegionField } from './RegionField';

// Wrapper to provide i18n context
const RegionFieldWithI18n = (props: Parameters<typeof RegionField>[0]) => (
  <I18nProvider>
    <RegionField {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/RegionField',
  component: RegionFieldWithI18n,
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
} satisfies Meta<typeof RegionFieldWithI18n>;

type Story = StoryObj<typeof RegionFieldWithI18n>;

export const Default: Story = {
  args: {
    value: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default region field with autocomplete from wine regions data.',
      },
    },
  },
};

export const Bordeaux: Story = {
  args: {
    value: 'Bordeaux',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Bordeaux selected.',
      },
    },
  },
};

export const Burgundy: Story = {
  args: {
    value: 'Burgundy',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Burgundy selected.',
      },
    },
  },
};

export const Champagne: Story = {
  args: {
    value: 'Champagne',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Champagne selected.',
      },
    },
  },
};

export const NapaValley: Story = {
  args: {
    value: 'Napa Valley',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Napa Valley selected.',
      },
    },
  },
};

export const Tuscany: Story = {
  args: {
    value: 'Tuscany',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Tuscany selected.',
      },
    },
  },
};

export const PartialInput: Story = {
  args: {
    value: 'Bord',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with partial input showing filtering behavior.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    value: 'Invalid Region',
    error: 'Please select a valid wine region',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field showing a validation error.',
      },
    },
  },
};

export const RequiredFieldError: Story = {
  args: {
    value: '',
    error: 'Region is required',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field showing a required field error.',
      },
    },
  },
};

export const MinLengthError: Story = {
  args: {
    value: 'A',
    error: 'Region must be at least 2 characters long',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field showing a minimum length validation error.',
      },
    },
  },
};

export const InvalidFormatError: Story = {
  args: {
    value: 'Region123!@#',
    error: 'Region can only contain letters, spaces, hyphens, and apostrophes',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field showing an invalid format error.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: 'Rioja',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled region field that cannot be interacted with.',
      },
    },
  },
};

export const AccentedRegion: Story = {
  args: {
    value: 'Côtes du Rhône',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with French accented characters.',
      },
    },
  },
};

export const HyphenatedRegion: Story = {
  args: {
    value: 'Saint-Julien',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with hyphenated region name.',
      },
    },
  },
};

export const ApostropheRegion: Story = {
  args: {
    value: "Val d'Aosta",
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with apostrophe in region name.',
      },
    },
  },
};

export const LongRegionName: Story = {
  args: {
    value: 'Appellation Contrôlée Châteauneuf-du-Pape',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with a long, complex region name.',
      },
    },
  },
};

export const GermanRegion: Story = {
  args: {
    value: 'Mosel-Saar-Ruwer',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with German wine region.',
      },
    },
  },
};

export const NewWorldRegion: Story = {
  args: {
    value: 'Barossa Valley',
  },
  parameters: {
    docs: {
      description: {
        story: 'Region field with Australian wine region.',
      },
    },
  },
};

export const FilteringDemo: Story = {
  args: {
    value: 'Chi',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates filtering behavior with partial input that could match "Chianti".',
      },
    },
  },
};
