import { globalStyle } from '@vanilla-extract/css';

// Modern CSS Reset
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
});

globalStyle('*', {
  margin: 0,
});

globalStyle('body', {
  lineHeight: 1.5,
  WebkitFontSmoothing: 'antialiased',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  MozOsxFontSmoothing: 'grayscale',
});

globalStyle('img, picture, video, canvas, svg', {
  display: 'block',
  maxWidth: '100%',
});

globalStyle('input, button, textarea, select', {
  font: 'inherit',
});

globalStyle('p, h1, h2, h3, h4, h5, h6', {
  overflowWrap: 'break-word',
});

globalStyle('#root', {
  isolation: 'isolate',
});
