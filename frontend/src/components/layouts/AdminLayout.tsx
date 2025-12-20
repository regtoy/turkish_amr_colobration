import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LayoutShell } from './LayoutShell'

export const AdminLayout = () => {
  const { t } = useTranslation()

  return (
    <LayoutShell title={t('pages.admin.title')} subtitle={t('pages.admin.subtitle')}>
      <Outlet />
    </LayoutShell>
  )
}
