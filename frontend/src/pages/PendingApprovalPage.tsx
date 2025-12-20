import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'

export const PendingApprovalPage = () => {
  const { t } = useTranslation()
  const { logout, refreshProfile, user, isLoading } = useAuthContext()
  const navigate = useNavigate()
  const { showToast } = useToast()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleRetry = async () => {
    const profile = await refreshProfile()
    if (!profile) return
    if (profile.role !== 'pending') {
      showToast(t('pages.pending.unlocked'), { variant: 'success' })
      navigate('/', { replace: true })
    } else {
      showToast(t('pages.pending.stillPending'), { variant: 'info' })
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" px={2}>
      <Card sx={{ width: '100%', maxWidth: 720 }}>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={700}>
                {t('pages.pending.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('pages.pending.subtitle')}
              </Typography>
            </Stack>

            <Alert severity="warning" variant="outlined">
              {t('pages.pending.banner')}
            </Alert>

            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('pages.pending.details')}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={700}>
                {t('pages.pending.signedInAs', { username: user?.username ?? '—' })}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="inherit" onClick={logout}>
                {t('actions.logout')}
              </Button>
              <Button variant="contained" onClick={handleRetry} disabled={isLoading}>
                {isLoading ? <Spinner label={t('status.loading')} /> : t('pages.pending.retry')}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
