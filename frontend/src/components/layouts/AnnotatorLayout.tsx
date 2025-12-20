import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { LayoutShell } from './LayoutShell'

export const AnnotatorLayout = () => {
  const { t } = useTranslation()

  return (
    <LayoutShell title={t('pages.annotator.title')} subtitle={t('pages.annotator.subtitle')}>
      <Outlet />
    </LayoutShell>
  )
}
