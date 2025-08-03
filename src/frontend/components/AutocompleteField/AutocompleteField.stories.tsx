import type { Meta, StoryObj } from '@storybook/react';
import { AutocompleteField } from './AutocompleteField';

const fruitOptions = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew'];
const countryOptions = [
  'United States',
  'Canada',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'United Kingdom',
  'Australia',
];
const colorOptions = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown'];

export default {
  title: 'Components/AutocompleteField',
  component: AutocompleteField,
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
    options: {
      control: 'object',
      description: 'Array of options to choose from',
    },
    label: {
      control: 'text',
      description: 'Field label text',
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
    noResultsMessage: {
      control: 'text',
      description: 'Message to show when no options match',
    },
  },
  args: {
    onChange: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof AutocompleteField>;

type Story = StoryObj<typeof AutocompleteField>;

export const Default: Story = {
  args: {
    value: '',
    options: fruitOptions,
    label: 'Favorite Fruit',
    placeholder: 'Type to search fruits...',
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic autocomplete field with filterable options.',
      },
    },
  },
};

export const WithValue: Story = {
  args: {
    value: 'Apple',
    options: fruitOptions,
    label: 'Favorite Fruit',
    placeholder: 'Type to search fruits...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field with a pre-selected value.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    value: 'Invalid fruit',
    options: fruitOptions,
    label: 'Favorite Fruit',
    placeholder: 'Type to search fruits...',
    error: 'Please select a valid fruit from the list',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field displaying a validation error.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: 'Apple',
    options: fruitOptions,
    label: 'Favorite Fruit',
    placeholder: 'Type to search fruits...',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled autocomplete field that cannot be interacted with.',
      },
    },
  },
};

export const EmptyOptions: Story = {
  args: {
    value: '',
    options: [],
    label: 'No Options Available',
    placeholder: 'No options to select from...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field with no available options.',
      },
    },
  },
};

export const CustomNoResultsMessage: Story = {
  args: {
    value: '',
    options: fruitOptions,
    label: 'Favorite Fruit',
    placeholder: 'Type to search fruits...',
    noResultsMessage: 'No fruits match your search. Try a different term.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field with a custom "no results" message.',
      },
    },
  },
};

export const Countries: Story = {
  args: {
    value: '',
    options: countryOptions,
    label: 'Country',
    placeholder: 'Search for a country...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field for selecting countries.',
      },
    },
  },
};

export const Colors: Story = {
  args: {
    value: 'Blue',
    options: colorOptions,
    label: 'Favorite Color',
    placeholder: 'Choose a color...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field for selecting colors.',
      },
    },
  },
};

export const LargeOptionsList: Story = {
  args: {
    value: '',
    options: [
      'Alabama',
      'Alaska',
      'Arizona',
      'Arkansas',
      'California',
      'Colorado',
      'Connecticut',
      'Delaware',
      'Florida',
      'Georgia',
      'Hawaii',
      'Idaho',
      'Illinois',
      'Indiana',
      'Iowa',
      'Kansas',
      'Kentucky',
      'Louisiana',
      'Maine',
      'Maryland',
      'Massachusetts',
      'Michigan',
      'Minnesota',
      'Mississippi',
      'Missouri',
      'Montana',
      'Nebraska',
      'Nevada',
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
      'North Carolina',
      'North Dakota',
      'Ohio',
      'Oklahoma',
      'Oregon',
      'Pennsylvania',
      'Rhode Island',
      'South Carolina',
      'South Dakota',
      'Tennessee',
      'Texas',
      'Utah',
      'Vermont',
      'Virginia',
      'Washington',
      'West Virginia',
      'Wisconsin',
      'Wyoming',
    ],
    label: 'US State',
    placeholder: 'Type to search states...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Autocomplete field with a large list of options to demonstrate filtering performance.',
      },
    },
  },
};

export const FilteringDemo: Story = {
  args: {
    value: 'Che',
    options: fruitOptions,
    label: 'Fruit Search Demo',
    placeholder: 'Type "Che" to see filtering...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates filtering behavior with partial input matching "Cherry".',
      },
    },
  },
};

export const CaseInsensitiveFiltering: Story = {
  args: {
    value: 'APPLE',
    options: fruitOptions,
    label: 'Case Insensitive Search',
    placeholder: 'Try typing in different cases...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows case-insensitive filtering - "APPLE" should match "Apple".',
      },
    },
  },
};
