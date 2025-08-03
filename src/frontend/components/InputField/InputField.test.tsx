import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputField } from './InputField';

describe('InputField', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    label: 'Test Field',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InputField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(onChange).toHaveBeenCalledTimes(5);
    // With controlled components that don't update value prop, each character is typed individually
    expect(onChange).toHaveBeenNthCalledWith(1, 'h');
    expect(onChange).toHaveBeenNthCalledWith(2, 'e');
    expect(onChange).toHaveBeenNthCalledWith(3, 'l');
    expect(onChange).toHaveBeenNthCalledWith(4, 'l');
    expect(onChange).toHaveBeenNthCalledWith(5, 'o');
  });

  it('calls onBlur when input loses focus', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();

    render(<InputField {...defaultProps} onBlur={onBlur} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('displays error message when error is provided', () => {
    render(<InputField {...defaultProps} error="This field is required" />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when there is an error', () => {
    render(<InputField {...defaultProps} error="Invalid input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('links error message to input with aria-describedby', () => {
    render(<InputField {...defaultProps} error="Invalid input" />);

    const input = screen.getByRole('textbox');
    const inputId = input.getAttribute('id');
    const errorElement = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-describedby', `${inputId}-error`);
    expect(errorElement).toHaveAttribute('id', `${inputId}-error`);
  });

  it('shows character count when showCharacterCount is true and maxLength is set', () => {
    render(<InputField {...defaultProps} value="hello" maxLength={10} showCharacterCount />);

    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('indicates over limit when value exceeds maxLength', () => {
    render(<InputField {...defaultProps} value="hello world" maxLength={5} showCharacterCount />);

    const characterCount = screen.getByText('11/5');
    expect(characterCount).toBeInTheDocument();
    expect(characterCount).toHaveAttribute('data-over-limit', 'true');
  });

  it('renders input suffix when provided', () => {
    render(<InputField {...defaultProps} inputSuffix={<button type="button">Suffix</button>} />);

    expect(screen.getByRole('button', { name: 'Suffix' })).toBeInTheDocument();
  });

  it('renders bottom content when provided', () => {
    render(<InputField {...defaultProps} bottomContent={<div>Bottom content</div>} />);

    expect(screen.getByText('Bottom content')).toBeInTheDocument();
  });

  it('shows both error and character count when both are present', () => {
    render(<InputField {...defaultProps} value="hello" error="Invalid input" maxLength={10} showCharacterCount />);

    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('has aria-live on character count for accessibility', () => {
    render(<InputField {...defaultProps} value="hello" maxLength={10} showCharacterCount />);

    const characterCount = screen.getByText('5/10');
    expect(characterCount).toHaveAttribute('aria-live', 'polite');
  });

  it('handles onChange with controlled component updates', async () => {
    const user = userEvent.setup();
    let currentValue = '';
    const onChange = vi.fn((value) => {
      currentValue = value;
    });

    const { rerender } = render(<InputField {...defaultProps} value={currentValue} onChange={onChange} />);

    const input = screen.getByRole('textbox');

    // Type first character
    await user.type(input, 't');
    expect(onChange).toHaveBeenCalledWith('t');

    // Update value and rerender
    currentValue = 't';
    rerender(<InputField {...defaultProps} value={currentValue} onChange={onChange} />);

    // Type second character - this will append to existing value
    await user.type(input, 'e');
    expect(onChange).toHaveBeenCalledWith('te');
  });

  it('does not show character count when maxLength is not set', () => {
    render(<InputField {...defaultProps} value="hello" showCharacterCount />);

    expect(screen.queryByText(/\/$/)).not.toBeInTheDocument();
  });

  it('does not show character count when showCharacterCount is false', () => {
    render(<InputField {...defaultProps} value="hello" maxLength={10} showCharacterCount={false} />);

    expect(screen.queryByText('5/10')).not.toBeInTheDocument();
  });

  it('generates unique IDs for multiple instances', () => {
    render(
      <>
        <InputField {...defaultProps} label="First Field" />
        <InputField {...defaultProps} label="Second Field" />
      </>,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id);
    expect(inputs[0]?.id).toMatch(/^«\w+»$/);
    expect(inputs[1]?.id).toMatch(/^«\w+»$/);
  });

  it('handles empty value correctly', () => {
    render(<InputField {...defaultProps} value="" maxLength={10} showCharacterCount />);

    expect(screen.getByText('0/10')).toBeInTheDocument();
  });

  it('handles maxLength boundary correctly', () => {
    const exactMaxValue = 'a'.repeat(10);
    const overMaxValue = 'a'.repeat(11);

    const { rerender } = render(
      <InputField {...defaultProps} value={exactMaxValue} maxLength={10} showCharacterCount />,
    );

    // At max length - should not be over limit
    let characterCount = screen.getByText('10/10');
    expect(characterCount).not.toHaveAttribute('data-over-limit', 'true');

    // Over max length - should be over limit
    rerender(<InputField {...defaultProps} value={overMaxValue} maxLength={10} showCharacterCount />);
    characterCount = screen.getByText('11/10');
    expect(characterCount).toHaveAttribute('data-over-limit', 'true');
  });

  it('sets aria-describedby only when there is an error', () => {
    const { rerender } = render(<InputField {...defaultProps} />);

    let input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-describedby');

    rerender(<InputField {...defaultProps} error="Error message" />);
    input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('sets aria-invalid correctly based on error state', () => {
    const { rerender } = render(<InputField {...defaultProps} />);

    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'false');

    rerender(<InputField {...defaultProps} error="Error message" />);
    input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('combines custom className with default styling', () => {
    render(<InputField {...defaultProps} className="custom-field" />);

    const fieldContainer = screen.getByRole('textbox').closest('.custom-field');
    expect(fieldContainer).toBeInTheDocument();
  });

  it('combines custom inputClassName with default input styling', () => {
    render(<InputField {...defaultProps} inputClassName="custom-input" />);

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-input');
  });

  it('handles different input types correctly', () => {
    const types: Array<'text' | 'email' | 'password' | 'tel' | 'url'> = ['text', 'email', 'password', 'tel', 'url'];

    types.forEach((type) => {
      const { unmount } = render(<InputField {...defaultProps} type={type} />);
      // Password inputs don't have textbox role, so find by test id or attribute
      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveAttribute('type', type);
      unmount();
    });
  });
});
