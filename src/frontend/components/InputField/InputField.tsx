import type { JSX, ReactNode } from 'react';
import { useId } from 'react';
import { ValidationError } from '#components/ValidationError';
import * as styles from './InputField.css';

export interface InputFieldProps {
  /**
   * Current field value
   */
  value: string;
  /**
   * Called when value changes
   */
  onChange: (value: string) => void;
  /**
   * Called when field loses focus
   */
  onBlur: () => void;
  /**
   * Field label text
   */
  label: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Optional text to display (e.g., "(optional)")
   */
  optional?: string | undefined;
  /**
   * Placeholder text
   */
  placeholder?: string | undefined;
  /**
   * Error message to display
   */
  error?: string | undefined;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS class name
   */
  className?: string | undefined;
  /**
   * Field name for form registration
   */
  name?: string | undefined;
  /**
   * Input type
   */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  /**
   * Maximum character length
   */
  maxLength?: number;
  /**
   * Show character count
   */
  showCharacterCount?: boolean;
  /**
   * Additional props to pass to the input element
   */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /**
   * Additional content to render after the input (e.g., buttons, icons)
   */
  inputSuffix?: ReactNode;
  /**
   * Custom CSS class for the input element
   */
  inputClassName?: string;
  /**
   * Additional content to render below the input
   */
  bottomContent?: ReactNode;
}

/**
 * Generic input field component with label, validation, and character count
 */
export function InputField({
  value,
  onChange,
  onBlur,
  label,
  required = false,
  optional,
  placeholder,
  error,
  disabled = false,
  className,
  name,
  type = 'text',
  maxLength,
  showCharacterCount = false,
  inputProps,
  inputSuffix,
  inputClassName,
  bottomContent,
}: InputFieldProps): JSX.Element {
  const fieldId = useId();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
  };

  const hasError = !!error;
  const errorId = hasError ? `${fieldId}-error` : undefined;
  const characterCount = value.length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <div className={`${styles.fieldContainer} ${className || ''}`}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
        {required && <span className={styles.requiredIndicator}>*</span>}
        {optional && <span className={styles.optionalIndicator}>{optional}</span>}
      </label>

      <div className={styles.inputContainer}>
        <input
          type={type}
          id={fieldId}
          name={name}
          value={value}
          onChange={handleInputChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          aria-describedby={errorId}
          aria-invalid={hasError}
          className={`${styles.input} ${inputClassName || ''}`}
          {...inputProps}
        />

        {inputSuffix}

        {bottomContent}
      </div>

      {(hasError || (showCharacterCount && maxLength)) && (
        <div className={styles.errorRow}>
          {hasError && <ValidationError message={error} fieldId={fieldId} />}
          {showCharacterCount && maxLength && (
            <div className={styles.characterCountInline} data-over-limit={isOverLimit} aria-live="polite">
              {characterCount}/{maxLength}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
