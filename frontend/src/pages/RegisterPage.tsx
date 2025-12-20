import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate } from 'react-router-dom'

import { authApi } from '@/api/auth'
import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import type { RegisterPayload } from '@/types/auth'
import { isRequired, isValidEmail, isValidPasswordLength } from '@/validation/authValidation'

export const RegisterPage = () => {
  const { t } = useTranslation()
  const { user, login } = useAuthContext()
  const { showToast } = useToast()
  const [form, setForm] = useState<RegisterPayload>({
    username: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleChange =
    (field: keyof RegisterPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  const validate = () => {
    const nextErrors: typeof errors = {}
    if (!isRequired(form.username)) nextErrors.username = t('validation.required')
    if (form.email && !isValidEmail(form.email)) nextErrors.email = t('validation.email')
    if (!isRequired(form.password)) {
      nextErrors.password = t('validation.required')
    } else if (!isValidPasswordLength(form.password, 6)) {
      nextErrors.password = t('validation.passwordLength')
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await authApi.register(form)
      showToast(t('pages.register.success'), { variant: 'success' })
    } catch (error) {
      console.error('Registration failed', error)
      showToast(t('pages.register.error'), { variant: 'error' })
      setIsSubmitting(false)
      return
    }

    try {
      await login({ username: form.username, password: form.password })
    } catch (error) {
      console.error('Auto-login failed after registration', error)
      showToast(t('pages.register.loginError'), { variant: 'warning' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" px={2}>
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack spacing={0.5} textAlign="center">
              <Typography variant="h4" fontWeight={700}>
                {t('pages.register.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('pages.register.subtitle')}
              </Typography>
            </Stack>

            <Alert severity="info">{t('pages.register.helper')}</Alert>

            <TextField
              label={t('fields.username')}
              value={form.username}
              onChange={handleChange('username')}
              error={Boolean(errors.username)}
              helperText={errors.username}
              fullWidth
              required
            />
            <TextField
              label={t('fields.email')}
              value={form.email}
              onChange={handleChange('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              type="email"
              fullWidth
            />
            <TextField
              label={t('fields.password')}
              value={form.password}
              onChange={handleChange('password')}
              error={Boolean(errors.password)}
              helperText={errors.password}
              type="password"
              fullWidth
              required
            />

            <Button type="submit" size="large" disabled={isSubmitting}>
              {isSubmitting ? <Spinner label={t('status.loading')} /> : t('actions.register')}
            </Button>

            <Typography textAlign="center" variant="body2">
              {t('pages.register.loginCta')}{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                {t('actions.login')}
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
