import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ValidationError } from './ValidationError';

describe('ValidationError', () => {
  const defaultProps = {
    message: 'This field is required',
    fieldId: 'test-field',
  };

  it('renders error message with correct text', () => {
    render(<ValidationError {...defaultProps} />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    render(<ValidationError {...defaultProps} />);

    const errorIcon = document.querySelector('svg[aria-hidden="true"]');
    expect(errorIcon).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<ValidationError {...defaultProps} />);

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute('id', 'test-field-error');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });

  it('renders screen reader text', () => {
    render(<ValidationError {...defaultProps} />);

    expect(screen.getByText('error.label:')).toBeInTheDocument();
  });

  it('displays different error messages correctly', () => {
    const { rerender } = render(<ValidationError {...defaultProps} />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();

    rerender(<ValidationError {...defaultProps} message="Invalid input format" />);

    expect(screen.getByText('Invalid input format')).toBeInTheDocument();
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
  });
});
