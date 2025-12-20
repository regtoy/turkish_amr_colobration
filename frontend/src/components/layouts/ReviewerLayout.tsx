import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LayoutShell } from './LayoutShell'

export const ReviewerLayout = () => {
  const { t } = useTranslation()

  return (
    <LayoutShell title={t('pages.reviewer.title')} subtitle={t('pages.reviewer.subtitle')}>
      <Outlet />
    </LayoutShell>
  )
}
