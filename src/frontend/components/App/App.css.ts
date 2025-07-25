import { style } from '@vanilla-extract/css';

export const app = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
});

export const appHeader = style({
  textAlign: 'center',
  padding: '2rem',
  background: 'rgba(0, 0, 0, 0.1)',
});

export const appHeaderTitle = style({
  fontSize: '3rem',
  margin: '0 0 0.5rem 0',
  fontWeight: 300,
  letterSpacing: '2px',
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2.5rem',
    },
  },
});

export const appHeaderSubtitle = style({
  fontSize: '1.2rem',
  margin: 0,
  opacity: 0.9,
});

export const appMain = style({
  flex: 1,
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const hero = style({
  textAlign: 'center',
  marginBottom: '3rem',
});

export const heroTitle = style({
  fontSize: '2.5rem',
  marginBottom: '1rem',
  fontWeight: 300,
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2rem',
    },
  },
});

export const heroDescription = style({
  fontSize: '1.1rem',
  lineHeight: 1.6,
  maxWidth: '600px',
  margin: '0 auto',
  opacity: 0.9,
});

export const comingSoon = style({
  display: 'flex',
  justifyContent: 'center',
});

export const placeholder = style({
  background: 'rgba(255, 255, 255, 0.1)',
  padding: '2rem',
  borderRadius: '12px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  maxWidth: '500px',
  width: '100%',
  '@media': {
    '(max-width: 768px)': {
      padding: '1.5rem',
    },
  },
});

export const placeholderTitle = style({
  marginTop: 0,
  fontSize: '1.5rem',
  marginBottom: '1rem',
});

export const featuresList = style({
  listStyle: 'none',
  padding: 0,
  margin: '1rem 0 0 0',
});

export const featuresListItem = style({
  padding: '0.5rem 0',
  fontSize: '0.95rem',
});

export const appFooter = style({
  textAlign: 'center',
  padding: '1rem',
  background: 'rgba(0, 0, 0, 0.2)',
  marginTop: '2rem',
});

export const appFooterText = style({
  margin: 0,
  opacity: 0.8,
  fontSize: '0.9rem',
});
