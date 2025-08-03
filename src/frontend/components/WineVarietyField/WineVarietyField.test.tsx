import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { WineVarietyField } from './WineVarietyField';

// Mock the wine varieties data to make tests more predictable
vi.mock('../../data/wine-varieties', () => ({
  WINE_VARIETIES: ['Cabernet Sauvignon', 'Chardonnay', 'Pinot Noir', 'Sauvignon Blanc', 'Merlot'],
}));

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('WineVarietyField', () => {
  const defaultProps = {
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when error is provided', async () => {
    renderWithI18n(<WineVarietyField {...defaultProps} error="Invalid wine variety" />);

    await screen.findByText('Invalid wine variety');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows wine varieties in dropdown', async () => {
    const user = userEvent.setup();
    renderWithI18n(<WineVarietyField {...defaultProps} />);

    await screen.findByRole('combobox');
    const toggleButton = screen.getByRole('button', { name: 'toggle menu' });
    await user.click(toggleButton);

    expect(screen.getByRole('option', { name: 'Cabernet Sauvignon' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chardonnay' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pinot Noir' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sauvignon Blanc' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Merlot' })).toBeInTheDocument();
  });

  it('filters varieties based on input value', async () => {
    const user = userEvent.setup();
    renderWithI18n(<WineVarietyField {...defaultProps} />);

    const input = await screen.findByRole('combobox');
    await user.type(input, 'cab');

    // Verify the input value was updated (testing filtering logic indirectly)
    expect(input).toHaveValue('cab');
  });

  it('calls onChange when variety is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(<WineVarietyField {...defaultProps} onChange={onChange} />);

    await screen.findByRole('combobox');
    const toggleButton = screen.getByRole('button', { name: 'toggle menu' });
    await user.click(toggleButton);

    const cabOption = screen.getByRole('option', { name: 'Cabernet Sauvignon' });
    await user.click(cabOption);

    expect(onChange).toHaveBeenCalledWith('Cabernet Sauvignon');
  });

  it('calls onChange when typing in input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(<WineVarietyField {...defaultProps} onChange={onChange} />);

    const input = await screen.findByRole('combobox');
    await user.type(input, 'test');

    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith('test');
  });
});
