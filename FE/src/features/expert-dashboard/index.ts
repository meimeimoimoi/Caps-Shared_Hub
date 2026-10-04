import { lazy } from 'react'
export const ExpertDashboardPage = lazy(() => import('./pages/ExpertDashboardPage'))
export const ExpertProfilePage = lazy(() => import('./pages/ExpertProfilePage'))
export const ExpertSettingsPage = lazy(() => import('./pages/ExpertSettingsPage'))
export const ExpertServicesPage = lazy(() => import('./pages/ExpertServicesPage'))
export const ExpertCasesPage = lazy(() => import('./pages/ExpertCasesPage'))
export const ExpertCaseDetailPage = lazy(() => import('./pages/ExpertCaseDetailPage').then(m => ({ default: m.ExpertCaseDetailPage })))
