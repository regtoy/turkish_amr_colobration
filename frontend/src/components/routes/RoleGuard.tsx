import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthContext } from '@/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import type { Role } from '@/types/auth'

interface RoleGuardProps {
  allowedRoles?: Role[]
  children: React.ReactElement
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuthContext()
  const location = useLocation()
  const { t } = useTranslation()

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
