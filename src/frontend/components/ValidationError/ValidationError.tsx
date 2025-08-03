import type { JSX } from 'react';
import * as styles from './ValidationError.css';

export interface ValidationErrorProps {
  /**
   * Error message to display
   */
  message: string;
  /**
   * ID of the field this error is associated with (for accessibility)
   */
  fieldId: string;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Accessible error message component for form validation
 */
export function ValidationError({ message, fieldId, className }: ValidationErrorProps): JSX.Element {
  const errorId = `${fieldId}-error`;

  return (
    <div id={errorId} className={`${styles.errorMessage} ${className || ''}`} role="alert" aria-live="polite">
      <svg className={styles.errorIcon} aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5l-4 7A1 1 0 006 16h8a1 1 0 00.867-1.5l-4-7A1 1 0 0010 7z"
          clipRule="evenodd"
        />
      </svg>
      <span className={styles.srOnly}>Error:</span>
      <span>{message}</span>
    </div>
  );
}
