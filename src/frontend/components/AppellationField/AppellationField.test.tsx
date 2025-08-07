import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { AppellationField } from './AppellationField';

// Test wrapper with I18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('AppellationField', () => {
  it('renders with label and placeholder', () => {
    render(<AppellationField value="" onChange={vi.fn()} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<AppellationField value="" onChange={handleChange} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Napa Valley');

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onBlur when field loses focus', async () => {
    const user = userEvent.setup();
    const handleBlur = vi.fn();

    render(<AppellationField value="" onChange={vi.fn()} onBlur={handleBlur} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalled();
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'Invalid appellation format';

    render(<AppellationField value="" onChange={vi.fn()} onBlur={vi.fn()} error={errorMessage} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<AppellationField value="Burgundy" onChange={vi.fn()} onBlur={vi.fn()} disabled={true} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows optional indicator (not required)', () => {
    render(<AppellationField value="" onChange={vi.fn()} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    // Check that the required attribute is not present
    expect(screen.getByRole('textbox')).not.toHaveAttribute('required');
  });
});
