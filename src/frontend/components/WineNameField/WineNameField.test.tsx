import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { WineNameField } from './WineNameField';

// Test wrapper with I18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('WineNameField', () => {
  it('renders with label and placeholder', () => {
    render(<WineNameField value="" onChange={vi.fn()} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<WineNameField value="" onChange={handleChange} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Grand Cru');

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onBlur when field loses focus', async () => {
    const user = userEvent.setup();
    const handleBlur = vi.fn();

    render(<WineNameField value="" onChange={vi.fn()} onBlur={handleBlur} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalled();
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'Wine name is required';

    render(<WineNameField value="" onChange={vi.fn()} onBlur={vi.fn()} error={errorMessage} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<WineNameField value="Test" onChange={vi.fn()} onBlur={vi.fn()} disabled={true} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
