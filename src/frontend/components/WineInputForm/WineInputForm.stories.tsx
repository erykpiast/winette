import type { Meta, StoryObj } from '@storybook/react';
import { I18nProvider } from '#components/I18nProvider';
import { WineInputForm } from './WineInputForm';

// Wrapper to provide i18n context
const WineInputFormWithI18n = (props: Parameters<typeof WineInputForm>[0]) => (
  <I18nProvider>
    <WineInputForm {...props} />
  </I18nProvider>
);

export default {
  title: 'Components/Wine Form/WineInputForm',
  component: WineInputFormWithI18n,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      action: 'submitted',
      description: 'Called when form is successfully submitted',
    },
    initialData: {
      control: 'object',
      description: 'Initial form data (for editing or pre-population)',
    },
    isSubmitting: {
      control: 'boolean',
      description: 'Whether the form is currently processing submission',
    },
    submitError: {
      control: 'text',
      description: 'Global form error message',
    },
    successMessage: {
      control: 'text',
      description: 'Success message to display',
    },
  },
  args: {
    onSubmit: () => {},
  },
} satisfies Meta<typeof WineInputFormWithI18n>;

type Story = StoryObj<typeof WineInputFormWithI18n>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default empty wine input form with all fields available for input.',
      },
    },
  },
};

export const WithInitialData: Story = {
  args: {
    initialData: {
      region: 'Bordeaux',
      wineVariety: 'Cabernet Sauvignon',
      producerName: 'Château Margaux',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form pre-populated with initial data for editing.',
      },
    },
  },
};

export const PartialInitialData: Story = {
  args: {
    initialData: {
      region: 'Napa Valley',
      producerName: 'Opus One',
      // wineVariety intentionally omitted
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with partial initial data (wine variety left empty).',
      },
    },
  },
};

export const FrenchWine: Story = {
  args: {
    initialData: {
      region: 'Burgundy',
      wineVariety: 'Pinot Noir',
      producerName: 'Domaine de la Romanée-Conti',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with French wine data including accented characters.',
      },
    },
  },
};

export const ItalianWine: Story = {
  args: {
    initialData: {
      region: 'Tuscany',
      wineVariety: 'Sangiovese',
      producerName: 'Antinori',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with Italian wine data.',
      },
    },
  },
};

export const GermanWine: Story = {
  args: {
    initialData: {
      region: 'Mosel',
      wineVariety: 'Riesling',
      producerName: 'Dr. Loosen',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with German wine data.',
      },
    },
  },
};

export const Submitting: Story = {
  args: {
    initialData: {
      region: 'Champagne',
      wineVariety: 'Chardonnay',
      producerName: 'Dom Pérignon',
    },
    isSubmitting: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form in submitting state with disabled fields and loading button.',
      },
    },
  },
};

export const WithSubmitError: Story = {
  args: {
    initialData: {
      region: 'Rioja',
      wineVariety: 'Tempranillo',
      producerName: 'Marqués de Riscal',
    },
    submitError: 'Failed to save wine data. Please check your connection and try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form displaying a submission error message.',
      },
    },
  },
};

export const WithSuccessMessage: Story = {
  args: {
    initialData: {
      region: 'Barossa Valley',
      wineVariety: 'Shiraz',
      producerName: 'Penfolds',
    },
    successMessage: 'Wine data saved successfully!',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form displaying a success message after submission.',
      },
    },
  },
};

export const NetworkError: Story = {
  args: {
    initialData: {
      region: 'Mendoza',
      wineVariety: 'Malbec',
      producerName: 'Catena Zapata',
    },
    submitError: 'Network error occurred. Please check your internet connection.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form showing a network error state.',
      },
    },
  },
};

export const ValidationErrors: Story = {
  args: {
    initialData: {
      region: 'A', // Too short
      wineVariety: '   ', // Only whitespace
      producerName: '', // Required but empty
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with data that would trigger validation errors on blur/submit.',
      },
    },
  },
};

export const LongProducerName: Story = {
  args: {
    initialData: {
      region: 'Central Coast',
      wineVariety: 'Pinot Noir',
      producerName: 'The Very Long Name Winery & Vineyard Estate Collection Reserve',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with a long producer name to test character counting.',
      },
    },
  },
};

export const BlendWine: Story = {
  args: {
    initialData: {
      region: 'Bordeaux',
      wineVariety: 'Bordeaux Blend',
      producerName: 'Château Pichon Baron',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with blend variety selection.',
      },
    },
  },
};

export const ChampagneExample: Story = {
  args: {
    initialData: {
      region: 'Champagne',
      producerName: 'Moët & Chandon',
      // Wine variety left empty as it's optional
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form for Champagne without specifying grape variety.',
      },
    },
  },
};

export const NewWorldWine: Story = {
  args: {
    initialData: {
      region: 'Sonoma County',
      wineVariety: 'Zinfandel',
      producerName: 'Ridge Vineyards',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with American wine data.',
      },
    },
  },
};

export const OrganicProducer: Story = {
  args: {
    initialData: {
      region: 'Loire Valley',
      wineVariety: 'Sauvignon Blanc',
      producerName: 'Domaine Henri Bourgeois',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with organic/biodynamic producer example.',
      },
    },
  },
};

export const CustomClassName: Story = {
  args: {
    className: 'custom-wine-form',
    initialData: {
      region: 'Piedmont',
      wineVariety: 'Nebbiolo',
      producerName: 'Gaja',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Wine input form with custom CSS class applied.',
      },
    },
  },
};
