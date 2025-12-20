import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Location,Navigate, useLocation } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import type { LoginPayload } from '@/types/auth'

export const LoginPage = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { login, user, isLoading } = useAuthContext()
  const { showToast } = useToast()
  const [credentials, setCredentials] = useState<LoginPayload>({ email: '', password: '' })

  if (user) {
    const redirectPath = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={redirectPath} replace />
  }

  const handleChange =
    (field: keyof LoginPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await login(credentials)
      showToast('Başarıyla giriş yapıldı', { variant: 'success' })
    } catch (error) {
      console.error('Login failed', error)
      showToast('Giriş başarısız. Bilgileri kontrol edin.', { variant: 'error' })
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" px={2}>
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack spacing={0.5} textAlign="center">
              <Typography variant="h4" fontWeight={700}>
                {t('pages.login.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('pages.login.subtitle')}
              </Typography>
            </Stack>

            <TextField
              label="E-posta"
              type="email"
              value={credentials.email}
              onChange={handleChange('email')}
              required
              fullWidth
            />
            <TextField
              label="Şifre"
              type="password"
              value={credentials.password}
              onChange={handleChange('password')}
              required
              fullWidth
            />

            <Button type="submit" disabled={isLoading} size="large">
              {isLoading ? <Spinner label={t('status.loading')} /> : t('actions.login')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
