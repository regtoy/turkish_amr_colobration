import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import type { Role } from '@/types/auth'

interface LayoutShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

interface NavItem {
  key: string
  label: string
  to: string
  roles?: Role[]
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ title, subtitle, children }) => {
  const { t } = useTranslation()
  const { user, logout } = useAuthContext()
  const location = useLocation()

  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('layout.dashboard'), to: '/' },
    { key: 'annotator', label: t('layout.annotator'), to: '/annotator', roles: ['annotator'] },
    { key: 'reviewer', label: t('layout.reviewer'), to: '/reviewer', roles: ['reviewer'] },
    { key: 'admin', label: t('layout.admin'), to: '/admin', roles: ['admin'] },
  ]

  const allowedNavItems = navItems.filter((item) => !item.roles?.length || item.roles.includes(user?.role as Role))

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <Box minHeight="100vh">
      <AppBar
        color="inherit"
        position="sticky"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" color="primary" fontWeight={700} component={Link} to="/">
            {t('brand')}
          </Typography>
          <Stack direction="row" spacing={1} flexGrow={1} alignItems="center">
            {allowedNavItems.map((item) => (
              <Button
                key={item.key}
                component={Link}
                to={item.to}
                color={isActivePath(item.to) ? 'secondary' : 'inherit'}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          {user && (
            <Button color="inherit" variant="outlined" onClick={logout} data-testid="logout-button">
              {t('actions.logout')}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          <Box>{children}</Box>
        </Stack>
      </Container>
    </Box>
  )
}
