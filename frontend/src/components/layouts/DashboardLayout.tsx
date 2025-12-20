import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LayoutShell } from './LayoutShell'

export const DashboardLayout = () => {
  const { t } = useTranslation()

  return (
    <LayoutShell title={t('pages.dashboard.title')} subtitle={t('pages.dashboard.subtitle')}>
      <Outlet />
    </LayoutShell>
  )
}
