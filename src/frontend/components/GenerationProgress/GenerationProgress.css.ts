import { globalStyle, keyframes, style } from '@vanilla-extract/css';

// Reuse WineInputForm styles for consistency
export const formContainer = style({
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '2rem',
  backgroundColor: '#ffffff',
  borderRadius: '0.75rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e5e7eb',
  position: 'relative',
});

export const formTitle = style({
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '2rem',
  textAlign: 'center',
});

export const formContent = style({
  position: 'relative',
});

export const fieldGroup = style({
  marginBottom: '1.5rem',
});

export const fieldLabel = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const fieldValue = style({
  width: '100%',
  padding: '0.75rem',
  fontSize: '1rem',
  color: '#111827',
  backgroundColor: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  minHeight: '2.75rem',
  display: 'flex',
  alignItems: 'center',
});

// Semi-transparent overlay
export const overlay = style({
  position: 'absolute',
  top: '-1rem',
  left: '-1rem',
  right: '-1rem',
  bottom: '4rem', // Leave buttons visible
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
});

export const overlayContent = style({
  textAlign: 'center',
  padding: '2rem',
});

// Button group at bottom
export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  marginTop: '2rem',
  position: 'relative',
  zIndex: 11, // Above overlay
});

export const primaryButton = style({
  padding: '0.75rem 2rem',
  fontSize: '1rem',
  fontWeight: '500',
  color: '#ffffff',
  backgroundColor: '#722F37',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  ':hover': {
    backgroundColor: '#5b252c',
  },
  ':active': {
    transform: 'translateY(1px)',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const secondaryButton = style({
  padding: '0.75rem 2rem',
  fontSize: '1rem',
  fontWeight: '500',
  color: '#722F37',
  backgroundColor: 'transparent',
  border: '2px solid #722F37',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    backgroundColor: '#722F37',
    color: '#ffffff',
  },
  ':active': {
    transform: 'translateY(1px)',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

// Status line below form
export const statusLine = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const separator = style({
  margin: '0 0.5rem',
});

// Spinner styles
export const spinnerWrapper = style({
  display: 'inline-block',
  position: 'relative',
  width: '160px',
  height: '160px',
  marginBottom: '1.5rem',
});

const pulse = keyframes({
  '0%, 100%': { transform: 'scale(0.95)' },
  '50%': { transform: 'scale(1.05)' },
});

export const spinner = style({
  width: '100%',
  height: '100%',
  // Convert black to #722F37 using CSS filters
  // Generated using: https://codepen.io/sosuke/pen/Pjoqqp
  filter: 'invert(20%) sepia(61%) saturate(853%) hue-rotate(314deg) brightness(73%) contrast(89%)',
});

export const grape = style({
  position: 'absolute',
  width: '20px',
  height: '20px',
  backgroundColor: '#722F37',
  borderRadius: '50%',
  opacity: 0.8,
});

// Position grapes in a cluster pattern
export const grape1 = style({
  top: '15px',
  left: '50px',
  animation: `${pulse} 1.5s ease-in-out infinite`,
});

export const grape2 = style({
  top: '25px',
  left: '35px',
  animation: `${pulse} 1.5s ease-in-out 0.2s infinite`,
});

export const grape3 = style({
  top: '25px',
  left: '65px',
  animation: `${pulse} 1.5s ease-in-out 0.4s infinite`,
});

export const grape4 = style({
  top: '40px',
  left: '25px',
  animation: `${pulse} 1.5s ease-in-out 0.6s infinite`,
});

export const grape5 = style({
  top: '40px',
  left: '50px',
  animation: `${pulse} 1.5s ease-in-out 0.8s infinite`,
});

export const grape6 = style({
  top: '40px',
  left: '75px',
  animation: `${pulse} 1.5s ease-in-out 1s infinite`,
});

export const grape7 = style({
  top: '60px',
  left: '40px',
  animation: `${pulse} 1.5s ease-in-out 1.2s infinite`,
});

export const grape8 = style({
  top: '60px',
  left: '60px',
  animation: `${pulse} 1.5s ease-in-out 1.4s infinite`,
});

export const processingText = style({
  fontSize: '1.125rem',
  fontWeight: '500',
  color: '#111827',
  marginBottom: '0.5rem',
});

export const processingSubtext = style({
  fontSize: '1rem',
  color: '#6b7280',
  marginBottom: '0.25rem',
});

export const processingNote = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

// Completed and failed states
export const completedContainer = style({
  textAlign: 'center',
  padding: '3rem',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '0.75rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e5e7eb',
});

export const successTitle = style({
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#10b981',
  marginBottom: '1rem',
});

export const resultSummary = style({
  marginBottom: '2rem',
  fontSize: '1rem',
  lineHeight: 1.6,
});

globalStyle(`${resultSummary} p`, {
  color: '#111827',
  margin: '0.5rem 0',
});

globalStyle(`${resultSummary} strong`, {
  fontWeight: '500',
  color: '#6b7280',
});

export const failedContainer = style({
  textAlign: 'center',
  padding: '3rem',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '0.75rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e5e7eb',
});

export const errorTitle = style({
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#ef4444',
  marginBottom: '1rem',
});

export const errorMessage = style({
  fontSize: '1rem',
  color: '#6b7280',
  marginBottom: '2rem',
  padding: '1rem',
  backgroundColor: '#fef2f2',
  borderRadius: '0.375rem',
  border: '1px solid #ef4444',
});

export const actions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  marginTop: '2rem',
});

// Remove old styles that are no longer used
export const container = style({});
export const summary = style({});
export const summaryTitle = style({});
export const summaryList = style({});
export const processingContainer = style({});
