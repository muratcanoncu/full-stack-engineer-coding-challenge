import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h3" sx={{ flexGrow: 1, color: 'common.white' }}>
            {t('app.title')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={RouterLink}
              to="/trades"
              sx={{
                color: 'common.white',
                textDecoration: location.pathname.startsWith('/trades') ? 'underline' : 'none',
              }}
            >
              {t('nav.trades')}
            </Button>
            {user && (
              <Button onClick={logout} sx={{ color: 'common.white' }}>
                {t('nav.logout')}
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 1024, mx: 'auto', p: { xs: 2, md: 4 } }}>{children}</Box>
    </Box>
  );
}
