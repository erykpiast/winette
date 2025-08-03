import { style } from '@vanilla-extract/css';

export const formContainer = style({
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '2rem', // p-8
  backgroundColor: '#ffffff',
  borderRadius: '0.75rem', // rounded-xl
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-lg
  border: '1px solid #e5e7eb', // border-gray-200
});

export const formTitle = style({
  fontSize: '1.5rem', // text-2xl
  fontWeight: '600', // font-semibold
  color: '#111827', // text-gray-900
  marginBottom: '0.5rem', // mb-2
  textAlign: 'center',
});

export const formDescription = style({
  fontSize: '1rem', // text-base
  color: '#6b7280', // text-gray-500
  marginBottom: '2rem', // mb-8
  textAlign: 'center',
  lineHeight: '1.5',
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem', // gap-6
});

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem', // gap-4
  marginTop: '1rem', // mt-4
  flexDirection: 'column',

  '@media': {
    '(min-width: 640px)': {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
  },
});

export const button = style({
  padding: '0.75rem 1.5rem', // px-6 py-3
  fontSize: '1rem', // text-base
  fontWeight: '500', // font-medium
  borderRadius: '0.5rem', // rounded-lg
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  textAlign: 'center',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem', // gap-2
  minHeight: '2.75rem', // min-h-11

  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  ':focus': {
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)', // focus:ring-blue-500/10
  },
});

export const primaryButton = style([
  button,
  {
    backgroundColor: '#3b82f6', // bg-blue-500
    color: '#ffffff',

    ':hover': {
      backgroundColor: '#2563eb', // hover:bg-blue-600
    },

    ':active': {
      backgroundColor: '#1d4ed8', // active:bg-blue-700
    },

    selectors: {
      '&:disabled': {
        backgroundColor: '#9ca3af', // disabled:bg-gray-400
      },
    },
  },
]);

export const secondaryButton = style([
  button,
  {
    backgroundColor: '#ffffff',
    color: '#374151', // text-gray-700
    border: '1px solid #d1d5db', // border-gray-300

    ':hover': {
      backgroundColor: '#f9fafb', // hover:bg-gray-50
      borderColor: '#9ca3af', // hover:border-gray-400
    },

    ':active': {
      backgroundColor: '#f3f4f6', // active:bg-gray-100
    },
  },
]);

export const loadingSpinner = style({
  width: '1rem', // w-4
  height: '1rem', // h-4
  borderRadius: '50%',
  border: '2px solid transparent',
  borderTop: '2px solid currentColor',
  animation: 'spin 1s linear infinite',
});

export const formError = style({
  padding: '1rem', // p-4
  backgroundColor: '#fef2f2', // bg-red-50
  border: '1px solid #fecaca', // border-red-200
  borderRadius: '0.5rem', // rounded-lg
  color: '#dc2626', // text-red-600
  fontSize: '0.875rem', // text-sm
  marginTop: '1rem', // mt-4
});

export const successMessage = style({
  padding: '1rem', // p-4
  backgroundColor: '#f0fdf4', // bg-green-50
  border: '1px solid #bbf7d0', // border-green-200
  borderRadius: '0.5rem', // rounded-lg
  color: '#16a34a', // text-green-600
  fontSize: '0.875rem', // text-sm
  marginTop: '1rem', // mt-4
});
