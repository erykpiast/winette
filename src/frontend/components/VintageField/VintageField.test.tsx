import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { VintageField } from './VintageField';

// Test wrapper with I18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('VintageField', () => {
  it('renders with label and placeholder', () => {
    render(<VintageField value="" onChange={vi.fn()} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('accepts valid year input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<VintageField value="" onChange={handleChange} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, '2021');

    expect(handleChange).toHaveBeenCalledWith('2021');
  });

  it('accepts NV input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<VintageField value="" onChange={handleChange} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'NV');

    expect(handleChange).toHaveBeenCalledWith('NV');
  });

  it('accepts N.V. input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<VintageField value="" onChange={handleChange} onBlur={vi.fn()} />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'N.V.');

    expect(handleChange).toHaveBeenCalledWith('N.V.');
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'Vintage is required';

    render(<VintageField value="" onChange={vi.fn()} onBlur={vi.fn()} error={errorMessage} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<VintageField value="2021" onChange={vi.fn()} onBlur={vi.fn()} disabled={true} />, { wrapper: TestWrapper });

    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
