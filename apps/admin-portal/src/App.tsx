import { CircularProgress, CssBaseline, Stack, ThemeProvider } from '@mui/material';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { TradesPage } from './pages/TradesPage';
import { theme } from './theme/theme';

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <Stack sx={{ minHeight: '100vh' }} alignItems="center" justifyContent="center">
        <CircularProgress />
      </Stack>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/trades"
              element={
                <RequireAuth>
                  <AppLayout>
                    <TradesPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/trades" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
