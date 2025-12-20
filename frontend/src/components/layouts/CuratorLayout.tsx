import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LayoutShell } from './LayoutShell'

export const CuratorLayout = () => {
  const { t } = useTranslation()

  return (
    <LayoutShell title={t('pages.curator.title')} subtitle={t('pages.curator.subtitle')}>
      <Outlet />
    </LayoutShell>
  )
}
