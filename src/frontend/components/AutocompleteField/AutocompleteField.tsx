import { useCombobox } from 'downshift';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { InputField } from '#components/InputField';
import * as styles from './AutocompleteField.css';

export interface AutocompleteFieldProps {
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
   * Array of options to display in autocomplete
   */
  options: readonly string[];
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
  placeholder?: string;
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
   * No results message
   */
  noResultsMessage?: string;
}

/**
 * Generic autocomplete input field with Downshift
 */
export function AutocompleteField({
  value,
  onChange,
  onBlur,
  options,
  label,
  required = false,
  optional,
  placeholder,
  error,
  disabled = false,
  className,
  name,
  noResultsMessage = 'No results found',
}: AutocompleteFieldProps): JSX.Element {
  // Remove duplicate options to fix the repeated entries issue
  const uniqueOptions = useMemo(() => {
    return Array.from(new Set(options));
  }, [options]);

  // Filter options based on current value
  const filteredOptions = useMemo(() => {
    if (!value || value.trim() === '') return uniqueOptions;
    const filtered = uniqueOptions.filter((option) => option.toLowerCase().includes(value.toLowerCase()));

    // If no matches and user has entered text, add the user's input as an option
    if (filtered.length === 0 && value.trim() !== '') {
      return [value.trim()];
    }

    return filtered;
  }, [value, uniqueOptions]);

  const { isOpen, getToggleButtonProps, getMenuProps, getInputProps, highlightedIndex, getItemProps } = useCombobox({
    items: filteredOptions,
    inputValue: value,
    selectedItem: value,
    defaultHighlightedIndex: 0, // Auto-highlight first item (which will be the no results option when present)
    onInputValueChange: ({ inputValue: newInputValue }) => {
      onChange(newInputValue || '');
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        // Check if this is a custom input (not in original options)
        const isCustomInput = !uniqueOptions.includes(selectedItem) && selectedItem === value.trim();
        if (isCustomInput) {
          // For custom input, just keep the current value and close dropdown
          onChange(selectedItem);
        } else {
          // For regular options, update the value
          onChange(selectedItem);
        }
      }
    },
    itemToString: (item) => item || '',
  });

  // Create the toggle button
  const toggleButton = (
    <button
      type="button"
      {...getToggleButtonProps()}
      aria-label="toggle menu"
      className={styles.toggleButton}
      disabled={disabled}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Toggle dropdown</title>
        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  // Create the dropdown menu
  const dropdownMenu = isOpen && (
    <ul {...getMenuProps()} className={styles.menu}>
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option, index) => {
          // Check if this option is the user's custom input (not in original options)
          const isCustomInput = !uniqueOptions.includes(option) && option === value.trim();
          const displayText = isCustomInput ? noResultsMessage : option;

          return (
            <li
              {...getItemProps({ item: option, index })}
              key={option}
              className={
                isCustomInput
                  ? `${styles.noResults} ${highlightedIndex === index ? styles.menuItemHighlighted : ''}`
                  : `${styles.menuItem} ${highlightedIndex === index ? styles.menuItemHighlighted : ''}`
              }
            >
              {displayText}
            </li>
          );
        })
      ) : (
        <li className={styles.noResults}>{noResultsMessage}</li>
      )}
    </ul>
  );

  return (
    <InputField
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      label={label}
      required={required}
      optional={optional}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      className={className}
      name={name}
      inputProps={getInputProps({
        autoComplete: 'off',
      })}
      inputClassName={styles.inputWithButton}
      inputSuffix={toggleButton}
      bottomContent={dropdownMenu}
    />
  );
}
