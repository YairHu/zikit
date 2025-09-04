import React, { useEffect } from 'react';
import AppRoutes from './routes';
import { UserProvider } from './contexts/UserContext';
import { initializeTableUpdates, checkTableUpdatesStatus, localStorageService } from './services/cacheService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { startAutomaticStatusUpdates } from './services/soldierService';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider } from '@mui/material/styles';
import { create } from 'jss';
import rtl from 'jss-rtl';
import { jssPreset, StylesProvider } from '@mui/styles';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: { 
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff'
    },
    secondary: { 
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff'
    },
    background: { 
      default: '#f8fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b'
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669'
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706'
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626'
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb'
    }
  },
  typography: {
    fontFamily: 'Heebo, Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none' as const,
    }
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e2e8f0',
        },
        head: {
          backgroundColor: '#f8fafc',
          fontWeight: 600,
        }
      }
    },
    // RTL Support for Material-UI components
    MuiInputBase: {
      styleOverrides: {
        input: {
          direction: 'rtl',
          textAlign: 'right',
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          direction: 'rtl',
          textAlign: 'right',
          right: 0,
          left: 'auto',
          transformOrigin: 'right',
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          direction: 'rtl',
          textAlign: 'right',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          direction: 'rtl',
          '& .MuiInputBase-root': {
            direction: 'rtl',
          }
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        input: {
          direction: 'rtl',
          textAlign: 'right',
        }
      }
    }
  }
});

const jss = create({ plugins: [...jssPreset().plugins, rtl()] });

function App() {
  useEffect(() => {
    // אתחול מערכת המטמון רק אחרי שהמשתמש מחובר
    const auth = getAuth();
    let stopAutomaticUpdates: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // בדיקת מצב טבלת העדכונים
          const status = await checkTableUpdatesStatus();
          
          // אתחול טבלת העדכונים
          await initializeTableUpdates();
          
          // יצירת listener אחד בלבד לטבלת העדכונים
          localStorageService.initializeUpdateListeners();
          
          // הפעלת עדכון אוטומטי של סטטוסי נוכחות
          stopAutomaticUpdates = startAutomaticStatusUpdates();
        } catch (error) {
          console.error('❌ [LOCAL_STORAGE] שגיאה באתחול מערכת מטמון מקומי:', error);
        }
      } else {
        // ניקוי listeners כשהמשתמש מתנתק
        localStorageService.cleanup();
        if (stopAutomaticUpdates) {
          stopAutomaticUpdates();
          stopAutomaticUpdates = null;
        }
      }
    });

    return () => {
      unsubscribe();
      // ניקוי listeners כשהאפליקציה נסגרת
      localStorageService.cleanup();
      if (stopAutomaticUpdates) {
        stopAutomaticUpdates();
      }
    };
  }, []);

  return (
    <StyledEngineProvider injectFirst>
      <StylesProvider jss={jss}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <UserProvider>
            <div dir="rtl">
              <AppRoutes />
            </div>
          </UserProvider>
        </ThemeProvider>
      </StylesProvider>
    </StyledEngineProvider>
  );
}

export default App;
