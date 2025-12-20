import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/components/layouts/AdminLayout'
import { AnnotatorLayout } from '@/components/layouts/AnnotatorLayout'
import { CuratorLayout } from '@/components/layouts/CuratorLayout'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ReviewerLayout } from '@/components/layouts/ReviewerLayout'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { AdminPage } from '@/pages/AdminPage'
import { AnnotatorPage } from '@/pages/AnnotatorPage'
import { CuratorPage } from '@/pages/CuratorPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PendingApprovalPage } from '@/pages/PendingApprovalPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ReviewerPage } from '@/pages/ReviewerPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/pending',
    element: <PendingApprovalPage />,
  },
  {
    path: '/',
    element: (
      <RoleGuard>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'annotator',
        element: (
          <RoleGuard allowedRoles={['annotator']}>
            <AnnotatorLayout />
          </RoleGuard>
        ),
        children: [{ index: true, element: <AnnotatorPage /> }],
      },
      {
        path: 'reviewer',
        element: (
          <RoleGuard allowedRoles={['reviewer']}>
            <ReviewerLayout />
          </RoleGuard>
        ),
        children: [{ index: true, element: <ReviewerPage /> }],
      },
      {
        path: 'curator',
        element: (
          <RoleGuard allowedRoles={['curator']}>
            <CuratorLayout />
          </RoleGuard>
        ),
        children: [{ index: true, element: <CuratorPage /> }],
      },
      {
        path: 'admin',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminLayout />
          </RoleGuard>
        ),
        children: [{ index: true, element: <AdminPage /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
