import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '#components/I18nProvider';
import { StyleSelector } from './StyleSelector';

// Test wrapper with I18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('StyleSelector', () => {
  it('renders all four style options', () => {
    render(<StyleSelector selectedStyle="classic" onStyleChange={vi.fn()} />, { wrapper: TestWrapper });

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('shows classic style as selected by default', () => {
    render(<StyleSelector selectedStyle="classic" onStyleChange={vi.fn()} />, { wrapper: TestWrapper });

    const classicOption = screen.getAllByRole('radio')[0];
    expect(classicOption).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onStyleChange when a different style is clicked', async () => {
    const user = userEvent.setup();
    const handleStyleChange = vi.fn();

    render(<StyleSelector selectedStyle="classic" onStyleChange={handleStyleChange} />, { wrapper: TestWrapper });

    const modernOption = screen.getAllByRole('radio')[1];
    if (modernOption) {
      await user.click(modernOption);
    }

    expect(handleStyleChange).toHaveBeenCalledWith('modern');
  });

  it('supports keyboard navigation with Enter key', async () => {
    const user = userEvent.setup();
    const handleStyleChange = vi.fn();

    render(<StyleSelector selectedStyle="classic" onStyleChange={handleStyleChange} />, { wrapper: TestWrapper });

    const elegantOption = screen.getAllByRole('radio')[2];
    if (elegantOption) {
      elegantOption.focus();
      await user.keyboard('{Enter}');
    }

    expect(handleStyleChange).toHaveBeenCalledWith('elegant');
  });

  it('supports keyboard navigation with Space key', async () => {
    const user = userEvent.setup();
    const handleStyleChange = vi.fn();

    render(<StyleSelector selectedStyle="classic" onStyleChange={handleStyleChange} />, { wrapper: TestWrapper });

    const funkyOption = screen.getAllByRole('radio')[3];
    if (funkyOption) {
      funkyOption.focus();
      await user.keyboard(' ');
    }

    expect(handleStyleChange).toHaveBeenCalledWith('funky');
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'Please select a style';

    render(<StyleSelector selectedStyle="classic" onStyleChange={vi.fn()} error={errorMessage} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', async () => {
    const user = userEvent.setup();
    const handleStyleChange = vi.fn();

    render(<StyleSelector selectedStyle="classic" onStyleChange={handleStyleChange} disabled={true} />, {
      wrapper: TestWrapper,
    });

    const modernOption = screen.getAllByRole('radio')[1];
    if (modernOption) {
      await user.click(modernOption);
    }

    expect(handleStyleChange).not.toHaveBeenCalled();
  });
});
