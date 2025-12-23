import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, type Location, Navigate, useLocation } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import type { LoginPayload } from '@/types/auth'
import { isRequired, isValidPasswordLength } from '@/validation/authValidation'

export const LoginPage = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { login, user, isLoading } = useAuthContext()
  const { showToast } = useToast()
  const [credentials, setCredentials] = useState<LoginPayload>({ username: '', password: '' })
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})

  if (user) {
    if (user.role === 'pending') return <Navigate to="/pending" replace />
    const redirectPath = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={redirectPath} replace />
  }

  const handleChange =
    (field: keyof LoginPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({ ...prev, [field]: event.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  const validate = () => {
    const nextErrors: typeof errors = {}
    if (!credentials.username.trim()) {
      nextErrors.username = t('validation.required')
    }
    if (!credentials.password.trim()) {
      nextErrors.password = t('validation.required')
    } else if (credentials.password.length < 6) {
      nextErrors.password = t('validation.passwordLength')
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    try {
      await login(credentials)
      showToast(t('pages.login.success'), { variant: 'success' })
    } catch (error) {
      console.error('Login failed', error)
      showToast(t('pages.login.error'), { variant: 'error' })
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

            <Alert severity="info">{t('pages.login.helper')}</Alert>

            <TextField
              label={t('fields.username')}
              type="text"
              value={credentials.username}
              onChange={handleChange('username')}
              error={Boolean(errors.username)}
              helperText={errors.username}
              fullWidth
            />
            <TextField
              label={t('fields.password')}
              type="password"
              value={credentials.password}
              onChange={handleChange('password')}
              error={Boolean(errors.password)}
              helperText={errors.password}
              fullWidth
            />

            <Button type="submit" disabled={isLoading} size="large">
              {isLoading ? <Spinner label={t('status.loading')} /> : t('actions.login')}
            </Button>

            <Typography textAlign="center" variant="body2">
              {t('pages.login.registerCta')}{' '}
              <Link component={RouterLink} to="/register" underline="hover">
                {t('pages.login.registerLink')}
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
