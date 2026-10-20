import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0A2540' : '#3B82F6',
        light: mode === 'light' ? '#1E3A8A' : '#60A5FA',
        dark: mode === 'light' ? '#030E1E' : '#1D4ED8',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: mode === 'light' ? '#0066CC' : '#38BDF8',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#D32F2F',
        light: '#EF4444',
        dark: '#991B1B',
      },
      warning: {
        main: '#D97706',
        light: '#F59E0B',
        dark: '#B45309',
      },
      success: {
        main: '#059669',
        light: '#10B981',
        dark: '#047857',
      },
      background: {
        default: mode === 'light' ? '#F4F7FB' : '#0F172A',
        paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
      },
      text: {
        primary: mode === 'light' ? '#0F172A' : '#F8FAFC',
        secondary: mode === 'light' ? '#475569' : '#94A3B8',
      },
      divider: mode === 'light' ? '#E2E8F0' : '#334155',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "-apple-system", "BlinkMacSystemFont", "Segoe UI", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 600,
      },
      subtitle1: {
        fontWeight: 600,
      },
      subtitle2: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'light' ? '#F4F7FB' : '#0F172A',
            scrollbarColor: mode === 'light' ? '#CBD5E1 #F1F5F9' : '#475569 #1E293B',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: '4px',
              backgroundColor: mode === 'light' ? '#CBD5E1' : '#475569',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: mode === 'light' ? '#0A2540' : '#3B82F6',
            '&:hover': {
              backgroundColor: mode === 'light' ? '#030E1E' : '#1D4ED8',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: mode === 'light' ? '0 4px 20px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)' : 'none',
            border: `1px solid ${mode === 'light' ? '#E2E8F0' : '#334155'}`,
            backgroundImage: 'none',
            transition: 'transform 180ms ease-in-out, box-shadow 180ms ease-in-out',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: mode === 'light' ? '#475569' : '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '14px 16px',
            borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 6,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
          },
        },
      },
    },
  });
