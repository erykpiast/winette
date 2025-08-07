import { style } from '@vanilla-extract/css';

export const container = style({
  width: '100%',
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem', // text-sm
  fontWeight: '500', // font-medium
  color: '#374151', // gray-700
  marginBottom: '0.75rem', // mb-3
});

export const requiredIndicator = style({
  color: '#dc2626', // red-600
  marginLeft: '0.25rem', // ml-1
});

export const stylesGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem', // gap-4
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
});

export const styleCard = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '1rem', // p-4
  border: '2px solid #e5e7eb', // border-gray-200
  borderRadius: '0.75rem', // rounded-xl
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  textAlign: 'center',

  ':hover': {
    borderColor: '#d1d5db', // border-gray-300
    backgroundColor: '#f9fafb', // bg-gray-50
  },

  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6', // border-blue-500
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)', // focus:ring-blue-500/10
    zIndex: 1,
  },

  selectors: {
    '&[data-selected="true"]': {
      borderColor: '#3b82f6', // border-blue-500
      backgroundColor: '#eff6ff', // bg-blue-50
    },
    '&[data-selected="true"]:hover': {
      borderColor: '#1d4ed8', // border-blue-700
      backgroundColor: '#dbeafe', // bg-blue-100
    },
    '&[aria-invalid="true"]': {
      borderColor: '#dc2626', // border-red-600
    },
  },
});

export const stylePreview = style({
  width: '3rem', // w-12
  height: '3rem', // h-12
  marginBottom: '0.5rem', // mb-2
  borderRadius: '0.375rem', // rounded-md
  backgroundColor: '#f3f4f6', // bg-gray-100
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem', // text-2xl
});

export const styleName = style({
  fontSize: '0.875rem', // text-sm
  fontWeight: '600', // font-semibold
  color: '#111827', // gray-900
  marginBottom: '0.25rem', // mb-1
});

export const styleDescription = style({
  fontSize: '0.75rem', // text-xs
  color: '#6b7280', // text-gray-500
  lineHeight: '1.25rem', // leading-tight
});

export const hiddenInput = style({
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none',
});

export const errorContainer = style({
  marginTop: '0.5rem', // mt-2
  minHeight: '1.25rem', // min-h-5 (to prevent layout shift)
});
