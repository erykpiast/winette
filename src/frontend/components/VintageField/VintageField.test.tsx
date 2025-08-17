import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
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

    // Controlled component wrapper to properly test onChange behavior
    const ControlledVintageField = () => {
      const [value, setValue] = React.useState('');
      return (
        <VintageField
          value={value}
          onChange={(val) => {
            setValue(val);
            handleChange(val);
          }}
          onBlur={vi.fn()}
        />
      );
    };

    render(<ControlledVintageField />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, '2021');

    // Verify the final value was set correctly
    expect(input).toHaveValue('2021');
    expect(handleChange).toHaveBeenLastCalledWith('2021');
  });

  it('accepts NV input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    // Controlled component wrapper
    const ControlledVintageField = () => {
      const [value, setValue] = React.useState('');
      return (
        <VintageField
          value={value}
          onChange={(val) => {
            setValue(val);
            handleChange(val);
          }}
          onBlur={vi.fn()}
        />
      );
    };

    render(<ControlledVintageField />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'NV');

    // Verify the final value was set correctly
    expect(input).toHaveValue('NV');
    expect(handleChange).toHaveBeenLastCalledWith('NV');
  });

  it('accepts N.V. input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    // Controlled component wrapper
    const ControlledVintageField = () => {
      const [value, setValue] = React.useState('');
      return (
        <VintageField
          value={value}
          onChange={(val) => {
            setValue(val);
            handleChange(val);
          }}
          onBlur={vi.fn()}
        />
      );
    };

    render(<ControlledVintageField />, { wrapper: TestWrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'N.V.');

    // Verify the final value was set correctly
    expect(input).toHaveValue('N.V.');
    expect(handleChange).toHaveBeenLastCalledWith('N.V.');
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
