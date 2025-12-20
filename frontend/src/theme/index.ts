import { createTheme } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1d4ed8',
      light: '#3b82f6',
      dark: '#1e3a8a',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#0f9f75',
    },
    background: {
      default: '#f7f7fb',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 14px 45px rgba(18, 38, 63, 0.08)',
        },
      },
    },
  },
})

export default theme
