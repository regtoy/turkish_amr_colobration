import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import type { Role } from '@/types/auth'

interface RoleGuardProps {
  allowedRoles?: Role[]
  children: React.ReactElement
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuthContext()
  const location = useLocation()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const lastNoticeRef = useRef<string | null>(null)

  useEffect(() => {
    if (isLoading) return

    const pushToast = (key: string, message: string, variant: 'info' | 'warning' = 'warning') => {
      if (lastNoticeRef.current === key) return
      lastNoticeRef.current = key
      showToast(message, { variant })
    }

    if (!user) {
      pushToast(
        'unauthenticated',
        t('auth.loginRequired', { defaultValue: 'Bu alana erişmek için giriş yapmalısınız.' }),
        'info',
      )
      return
    }

    if (user.role === 'pending') {
      pushToast('pending', t('auth.pendingApproval', { defaultValue: 'Hesabınız onay sürecinde.' }), 'info')
      return
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      pushToast('unauthorized', t('auth.notAuthorized', { defaultValue: 'Bu sayfaya erişim izniniz yok.' }))
    }
  }, [allowedRoles, isLoading, showToast, t, user])

  if (isLoading) {
    return <Spinner fullScreen label={t('status.loading')} />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role === 'pending') {
    return <Navigate to="/pending" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
