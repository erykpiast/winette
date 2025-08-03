import { style } from '@vanilla-extract/css';

export const inputWithButton = style({
  borderRadius: '0.5rem 0 0 0.5rem', // rounded-l-lg
});

export const toggleButton = style({
  padding: '0.75rem', // p-3
  border: '1px solid #d1d5db', // border-gray-300
  borderLeft: 'none',
  borderRadius: '0 0.5rem 0.5rem 0', // rounded-r-lg
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280', // text-gray-500
  transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',

  ':hover': {
    backgroundColor: '#f9fafb', // bg-gray-50
    borderColor: '#9ca3af', // border-gray-400
  },

  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6', // border-blue-500
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)', // focus:ring-blue-500/10
  },

  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const menu = style({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 1000,
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db', // border-gray-300
  borderTop: 'none',
  borderRadius: '0 0 0.5rem 0.5rem', // rounded-b-lg
  maxHeight: '12rem', // max-h-48
  overflowY: 'auto',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-lg
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const menuItem = style({
  padding: '0.75rem', // p-3
  cursor: 'pointer',
  borderBottom: '1px solid #f3f4f6', // border-b border-gray-100
  transition: 'background-color 0.15s ease-in-out',
  color: '#1f2937', // text-gray-800
  fontSize: '1rem', // text-base

  ':hover': {
    backgroundColor: '#f3f4f6', // bg-gray-100
  },

  ':last-child': {
    borderBottom: 'none',
  },
});

export const menuItemHighlighted = style({
  backgroundColor: '#dbeafe', // bg-blue-50
  color: '#1e40af', // text-blue-800
});

export const noResults = style({
  padding: '0.75rem', // p-3
  color: '#6b7280', // text-gray-500
  fontSize: '0.875rem', // text-sm
  fontStyle: 'italic',
  textAlign: 'center',
  listStyle: 'none',
});
