import { style } from '@vanilla-extract/css';

export const fieldContainer = style({
  position: 'relative',
  width: '100%',
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem', // text-sm
  fontWeight: '500', // font-medium
  color: '#374151', // gray-700
  marginBottom: '0.375rem', // mb-1.5
});

export const requiredIndicator = style({
  color: '#dc2626', // red-600
  marginLeft: '0.25rem', // ml-1
});

export const optionalIndicator = style({
  color: '#6b7280', // gray-500
  marginLeft: '0.25rem', // ml-1
  fontWeight: '400', // font-normal
  fontSize: '0.75rem', // text-xs
});

export const inputContainer = style({
  position: 'relative',
  display: 'flex',
});

export const input = style({
  flex: 1,
  padding: '0.75rem', // p-3
  fontSize: '1rem', // text-base
  border: '1px solid #d1d5db', // border-gray-300
  borderRadius: '0.5rem', // rounded-lg
  backgroundColor: '#ffffff',
  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',

  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6', // border-blue-500
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)', // focus:ring-blue-500/10
    zIndex: 1,
  },

  ':hover': {
    borderColor: '#9ca3af', // border-gray-400
  },

  '::placeholder': {
    color: '#9ca3af', // placeholder-gray-400
  },

  selectors: {
    '&[aria-invalid="true"]': {
      borderColor: '#dc2626', // border-red-600
      boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.1)', // focus:ring-red-600/10
    },
    '&[aria-invalid="true"]:focus': {
      borderColor: '#dc2626', // border-red-600
      boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.1)', // focus:ring-red-600/10
    },
  },
});

export const characterCount = style({
  fontSize: '0.75rem', // text-xs
  color: '#6b7280', // text-gray-500
  textAlign: 'right',
  marginTop: '0.25rem', // mt-1

  selectors: {
    '&[data-over-limit="true"]': {
      color: '#dc2626', // text-red-600
      fontWeight: '500', // font-medium
    },
  },
});

export const errorRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: '0.25rem', // mt-1
  minHeight: '1.25rem', // min-h-5 (to prevent layout shift)
});

export const characterCountInline = style({
  fontSize: '0.75rem', // text-xs
  color: '#6b7280', // text-gray-500
  flexShrink: 0,
  marginLeft: '0.5rem', // ml-2

  selectors: {
    '&[data-over-limit="true"]': {
      color: '#dc2626', // text-red-600
      fontWeight: '500', // font-medium
    },
  },
});
