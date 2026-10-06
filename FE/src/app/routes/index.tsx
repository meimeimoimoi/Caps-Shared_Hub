import { Suspense, lazy } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ExpertRoute } from './ExpertRoute'
import { ExpertLayout } from '../layouts/expert/ExpertLayout'
import { DraftRoute } from './DraftRoute'
import { DraftLayout } from '../layouts/drafts/DraftLayout'
const DraftListPage = lazy(() => import('@/pages/drafts/DraftListPage'))
const DraftTemplatePage = lazy(() => import('@/pages/drafts/DraftTemplatePage'))
const DraftTemplateDetailPage = lazy(
  () => import('@/pages/drafts/DraftTemplateDetailPage')
)
const DraftInputPage = lazy(() => import('@/pages/drafts/DraftInputPage'))
const DraftGenerationPage = lazy(
  () => import('@/pages/drafts/DraftGenerationPage')
)
const DraftPreviewPage = lazy(() => import('@/pages/drafts/DraftPreviewPage'))
const DraftHistoryPage = lazy(() => import('@/pages/drafts/DraftHistoryPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ExpertRegistrationPage = lazy(
  () => import('@/pages/expert-registration/ExpertRegistrationPage')
)
const ExpertDashboardPage = lazy(
  () => import('@/pages/expert-dashboard/ExpertDashboardPage')
)
const ExpertProfilePage = lazy(
  () => import('@/pages/expert-dashboard/ExpertProfilePage')
)
const ExpertSettingsPage = lazy(
  () => import('@/pages/expert-dashboard/ExpertSettingsPage')
)
const ExpertServicesPage = lazy(
  () => import('@/pages/expert-dashboard/ExpertServicesPage')
)
const ExpertCasesPage = lazy(
  () => import('@/pages/expert-dashboard/ExpertCasesPage')
)
const ExpertCaseDetailPage = lazy(() =>
  import('@/pages/expert-dashboard/ExpertCaseDetailPage').then((m) => ({
    default: m.ExpertCaseDetailPage,
  }))
)
const ExpertIncomePage = lazy(
  () => import('@/pages/expert-dashboard/ExpertIncomePage')
)

const DashboardPage = lazy(() => import('../../pages/DashboardPage'))
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'))
const AdminPendingExpertsPage = lazy(
  () => import('@/pages/admin/AdminPendingExpertsPage')
)
const AdminApplicationDetailPage = lazy(
  () => import('@/pages/admin/AdminApplicationDetailPage')
)
const AdminExpertsPage = lazy(() => import('@/pages/admin/AdminExpertsPage'))
const AdminDisputeDetailPage = lazy(() => import('@/pages/admin/AdminDisputeDetailPage'))
const AdminEscrowPage = lazy(() => import('@/pages/admin/AdminEscrowPage'))
const KnowledgeQueuePage = lazy(() => import('@/pages/knowledge-admin/KnowledgeQueuePage'))
const KnowledgeSourcesPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeSourcesPage'))
const KnowledgeVersionPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeVersionPage'))
const KnowledgeReviewPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeReviewPage'))
const KnowledgeDocumentPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeDocumentPage'))
const KnowledgeDocumentsPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeDocumentsPage'))
const KnowledgeUploadsPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeUploadsPage'))

function Fallback() {
  return (
    <div className="bg-desk-2 text-fg-muted flex min-h-svh items-center justify-center">
      <div role="status" className="flex items-center gap-3 text-sm">
        <span
          aria-hidden="true"
          className="border-border border-t-accent size-5 animate-spin rounded-full border-2 motion-reduce:animate-none"
        />
        <span>Loading…</span>
      </div>
    </div>
  )
}

// Data router enables a real navigation blocker for unsaved input, including browser Back.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <Suspense fallback={<Fallback />}>
          <Outlet />
        </Suspense>
      }
    >
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/expert/register" element={<ExpertRegistrationPage />} />
      {/* TODO(auth): bọc ProtectedRoute + check role admin khi có API */}
      <Route path="/admin/experts" element={<AdminExpertsPage />} />
      <Route
        path="/admin/experts/pending"
        element={<AdminPendingExpertsPage />}
      />
      <Route
        path="/admin/experts/:id"
        element={<AdminApplicationDetailPage />}
      />
      <Route path="/admin/disputes" element={<AdminDisputeDetailPage />} />
      <Route path="/admin/disputes/:id" element={<AdminDisputeDetailPage />} />
      <Route path="/admin/escrow" element={<AdminEscrowPage />} />
      {/* TODO(auth): bọc ProtectedRoute + check role Knowledge Admin khi có API */}
      <Route path="/knowledge" element={<Navigate to="/knowledge/queue" replace />} />
      <Route path="/knowledge/queue" element={<KnowledgeQueuePage />} />
      <Route path="/knowledge/sources" element={<KnowledgeSourcesPage />} />
      <Route path="/knowledge/uploads" element={<KnowledgeUploadsPage />} />
      <Route path="/knowledge/documents" element={<KnowledgeDocumentsPage />} />
      <Route
        path="/knowledge/documents/:id"
        element={<KnowledgeDocumentPage />}
      />
      <Route
        path="/knowledge/documents/:id/compare"
        element={<KnowledgeVersionPage />}
      />
      <Route
        path="/knowledge/documents/:id/review"
        element={<KnowledgeReviewPage />}
      />

      <Route element={<DraftRoute />}>
        <Route path="/drafts" element={<DraftLayout />}>
          <Route index element={<DraftListPage />} />
          <Route path="templates" element={<DraftTemplatePage />} />
          <Route
            path="templates/:templateVersionId"
            element={<DraftTemplateDetailPage />}
          />
          <Route path=":workspaceId/input" element={<DraftInputPage />} />
          <Route
            path=":workspaceId/generations/:jobId"
            element={<DraftGenerationPage />}
          />
          <Route
            path=":workspaceId/versions/:draftVersionId"
            element={<DraftPreviewPage />}
          />
          <Route path=":workspaceId/history" element={<DraftHistoryPage />} />
        </Route>
      </Route>

      <Route element={<ExpertRoute />}>
        <Route path="/expert" element={<ExpertLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<ExpertDashboardPage />} />
          <Route path="cases" element={<ExpertCasesPage key="cases" />} />
          <Route path="queue" element={<ExpertCasesPage key="queue" />} />
          <Route path="active" element={<ExpertCasesPage key="active" />} />
          <Route path="cases/:id" element={<ExpertCaseDetailPage />} />
          <Route path="services" element={<ExpertServicesPage />} />
          <Route path="income" element={<ExpertIncomePage />} />
          <Route path="profile" element={<ExpertProfilePage />} />
          <Route path="settings" element={<ExpertProfilePage />} />
          <Route path="settings/:section" element={<ExpertSettingsPage />} />
        </Route>
      </Route>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
)

export function AppRoutes() {
  return <RouterProvider router={router} />
}
