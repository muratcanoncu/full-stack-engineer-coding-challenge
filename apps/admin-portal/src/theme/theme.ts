import { createTheme } from '@mui/material/styles';

/**
 * Admin portal theme. Slightly darker primary than partner-portal to make the
 * portals visually distinct when an admin has both open in tabs.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#5a3d8a' },
    secondary: { main: '#0e7c66' },
    background: {
      default: '#f6f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1f2c',
      secondary: '#5b6372',
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 600 },
    h2: { fontSize: '1.5rem', fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid rgba(0,0,0,0.08)' } },
    },
  },
});
