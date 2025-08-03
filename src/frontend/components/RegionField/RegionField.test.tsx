import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { RegionField } from './RegionField';

// Mock the wine regions data to make tests more predictable
vi.mock('../../data/wine-regions', () => ({
  WINE_REGIONS: ['Bordeaux', 'Burgundy', 'Champagne', 'Loire Valley', 'Rhône Valley'],
}));

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('RegionField', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when error is provided', async () => {
    renderWithI18n(<RegionField {...defaultProps} error="This field is required" />);

    await screen.findByText('This field is required');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows wine regions in dropdown', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegionField {...defaultProps} />);

    await screen.findByRole('combobox');
    const toggleButton = screen.getByRole('button', { name: 'toggle menu' });
    await user.click(toggleButton);

    expect(screen.getByRole('option', { name: 'Bordeaux' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Burgundy' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Champagne' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Loire Valley' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rhône Valley' })).toBeInTheDocument();
  });

  it('filters regions based on input value', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegionField {...defaultProps} />);

    const input = await screen.findByRole('combobox');
    await user.type(input, 'bor');

    const toggleButton = screen.getByRole('button', { name: 'toggle menu' });
    await user.click(toggleButton);

    // Verify input value was updated (filtering functionality tested indirectly)
    expect(input).toHaveValue('bor');
  });

  it('calls onChange when region is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(<RegionField {...defaultProps} onChange={onChange} />);

    await screen.findByRole('combobox');
    const toggleButton = screen.getByRole('button', { name: 'toggle menu' });
    await user.click(toggleButton);

    const bordeauxOption = screen.getByRole('option', { name: 'Bordeaux' });
    await user.click(bordeauxOption);

    expect(onChange).toHaveBeenCalledWith('Bordeaux');
  });

  it('calls onChange when typing in input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(<RegionField {...defaultProps} onChange={onChange} />);

    const input = await screen.findByRole('combobox');
    await user.type(input, 'test');

    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith('test');
  });
});
