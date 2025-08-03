import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { ProducerNameField } from './ProducerNameField';

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('ProducerNameField', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when error is provided', async () => {
    renderWithI18n(<ProducerNameField {...defaultProps} error="Producer name is required" />);

    await screen.findByText('Producer name is required');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithI18n(<ProducerNameField {...defaultProps} onChange={onChange} />);

    const input = await screen.findByRole('textbox');
    await user.type(input, 'Dom Pérignon');

    expect(onChange).toHaveBeenCalledTimes(12);
    expect(onChange).toHaveBeenLastCalledWith('n'); // Last character typed
  });

  it('calls onBlur when field loses focus', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();

    renderWithI18n(<ProducerNameField {...defaultProps} onBlur={onBlur} />);

    const input = await screen.findByRole('textbox');
    await user.click(input);
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('shows character count by default', async () => {
    renderWithI18n(<ProducerNameField {...defaultProps} value="Test Winery" />);

    await screen.findByText('11/100');
  });

  it('hides character count when showCharacterCount is false', async () => {
    renderWithI18n(<ProducerNameField {...defaultProps} value="Test Winery" showCharacterCount={false} />);

    await screen.findByRole('textbox');
    expect(screen.queryByText('11/100')).not.toBeInTheDocument();
  });

  it('shows custom character count with custom max length', async () => {
    renderWithI18n(<ProducerNameField {...defaultProps} value="Test" maxLength={50} />);

    await screen.findByText('4/50');
  });

  it('prevents typing beyond max length', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const longText = 'a'.repeat(105); // 105 characters, more than default 100

    renderWithI18n(<ProducerNameField {...defaultProps} onChange={onChange} />);

    const input = await screen.findByRole('textbox');
    await user.type(input, longText);

    // onChange should be called 105 times (each character triggers onChange)
    expect(onChange).toHaveBeenCalledTimes(105);
    // The last call should be with the last character typed
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('allows typing exactly at max length', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const exactLengthText = 'a'.repeat(100);

    renderWithI18n(<ProducerNameField {...defaultProps} onChange={onChange} />);

    const input = await screen.findByRole('textbox');
    await user.type(input, exactLengthText);

    expect(onChange).toHaveBeenCalledTimes(100);
    expect(onChange).toHaveBeenLastCalledWith('a'); // Last character typed
  });

  it('handles typing when already at max length', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const maxLengthText = 'a'.repeat(100);

    renderWithI18n(<ProducerNameField {...defaultProps} value={maxLengthText} onChange={onChange} />);

    const input = await screen.findByRole('textbox');
    await user.type(input, 'extra');

    // Should not call onChange since we're already at max length
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows over-limit indicator when value exceeds max length', async () => {
    const longValue = 'a'.repeat(105); // More than default 100
    renderWithI18n(<ProducerNameField {...defaultProps} value={longValue} />);

    const characterCount = await screen.findByText('105/100');
    expect(characterCount).toHaveAttribute('data-over-limit', 'true');
  });

  it('supports empty value', async () => {
    renderWithI18n(<ProducerNameField {...defaultProps} value="" />);

    const input = await screen.findByRole('textbox');
    expect(input).toHaveValue('');

    await screen.findByText('0/100');
  });
});
