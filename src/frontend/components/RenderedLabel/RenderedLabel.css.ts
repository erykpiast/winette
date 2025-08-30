import { keyframes, style } from '@vanilla-extract/css';

// Define keyframes first
const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  maxWidth: '600px',
  margin: '0 auto',
});

export const header = style({
  textAlign: 'center',
});

export const title = style({
  fontSize: '24px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 8px 0',
});

export const subtitle = style({
  fontSize: '16px',
  color: '#6b7280',
  margin: '0',
});

export const imageContainer = style({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '300px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  overflow: 'hidden',
});

export const labelImage = style({
  maxWidth: '100%',
  maxHeight: '500px',
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
  transition: 'opacity 0.3s ease-in-out',
});

export const loadingState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '40px',
});

export const loadingSpinner = style({
  width: '32px',
  height: '32px',
  border: '3px solid #e5e7eb',
  borderTop: '3px solid #3b82f6',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});

export const loadingText = style({
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
});

export const errorState = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '40px',
});

export const errorMessage = style({
  fontSize: '14px',
  color: '#ef4444',
  textAlign: 'center',
  margin: '0',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
});

export const downloadButton = style({
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#ffffff',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',

  ':hover': {
    backgroundColor: '#2563eb',
    transform: 'translateY(-1px)',
  },

  ':active': {
    transform: 'translateY(0)',
  },

  ':disabled': {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    transform: 'none',
  },
});

export const details = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  paddingTop: '16px',
  borderTop: '1px solid #e5e7eb',
});

export const detailsText = style({
  fontSize: '12px',
  color: '#6b7280',
  margin: '0',
  textAlign: 'center',
});
