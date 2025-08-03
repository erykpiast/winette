import { style } from '@vanilla-extract/css';

export const errorMessage = style({
  color: '#dc2626', // red-600
  fontSize: '0.875rem', // text-sm
  marginTop: '0.25rem', // mt-1
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem', // gap-1.5
  minHeight: '1.25rem', // min-h-5 (to prevent layout shift)
});

export const errorIcon = style({
  width: '1rem', // w-4
  height: '1rem', // h-4
  flexShrink: 0,
  fill: 'currentColor',
});

export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
});
