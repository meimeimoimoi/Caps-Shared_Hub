import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { MotionPage } from '@/components/ui/motion'
import { ProtectedRoute, StaffRoute } from './ProtectedRoute'
import { ExpertRoute } from './ExpertRoute'
import { ExpertLayout } from '../layouts/expert/ExpertLayout'
import { DraftRoute } from './DraftRoute'
import { RouteErrorPage } from './RouteErrorPage'
import { AccountSettings } from '@/features/auth'
import { DraftLayout } from '../layouts/drafts/DraftLayout'
const ReviewerLayout = lazy(() => import('../layouts/reviewer/ReviewerLayout'))
const ReviewerQueuePage = lazy(
  () => import('@/pages/reviewer/ReviewerQueuePage')
)
const ReviewerAssessmentPage = lazy(
  () => import('@/pages/reviewer/ReviewerAssessmentPage')
)
const ReviewerHistoryPage = lazy(
  () => import('@/pages/reviewer/ReviewerHistoryPage')
)
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
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
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
const ExpertPricingPage = lazy(
  () => import('@/pages/expert-dashboard/ExpertPricingPage')
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

const HomePage = lazy(() => import('@/pages/home/HomePage'))
const ExpertBioPage = lazy(() => import('@/pages/expert-dashboard/ExpertBioPage'))
const ExpertPublicProfilePage = lazy(() => import('@/pages/ExpertPublicProfilePage'))
const DashboardPage = lazy(() => import('../../pages/DashboardPage'))
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'))
const AdminPendingExpertsPage = lazy(
  () => import('@/pages/admin/AdminPendingExpertsPage')
)
const AdminApplicationDetailPage = lazy(
  () => import('@/pages/admin/AdminApplicationDetailPage')
)
const AdminExpertsPage = lazy(() => import('@/pages/admin/AdminExpertsPage'))
const AdminDisputesPage = lazy(() => import('@/pages/admin/AdminDisputesPage'))
const AdminDisputeDetailPage = lazy(
  () => import('@/pages/admin/AdminDisputeDetailPage')
)
const AdminEscrowPage = lazy(() => import('@/pages/admin/AdminEscrowPage'))
const AdminPricingPage = lazy(() => import('@/pages/admin/AdminPricingPage'))
const AdminPricingTierPage = lazy(
  () => import('@/pages/admin/AdminPricingTierPage')
)
const AdminAccountPage = lazy(() => import('@/pages/admin/AdminAccountPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminDashboardPage = lazy(
  () => import('@/pages/admin/AdminDashboardPage')
)
const KnowledgeQueuePage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeQueuePage')
)
const KnowledgeSourcesPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeSourcesPage')
)
const KnowledgeVersionPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeVersionPage')
)
const KnowledgeReviewPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeReviewPage')
)
const KnowledgeDocumentPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeDocumentPage')
)
const KnowledgeDocumentsPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeDocumentsPage')
)
const KnowledgeUploadsPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeUploadsPage')
)
const KnowledgeTemplatesPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeTemplatesPage')
)
const KnowledgeTemplateNewPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeTemplateNewPage')
)
const KnowledgeTemplatePage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeTemplatePage')
)
const KnowledgeDashboardPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeDashboardPage')
)
const KnowledgeAccountPage = lazy(
  () => import('@/pages/knowledge-admin/KnowledgeAccountPage')
)
const AiAssistantPage = lazy(
  () => import('@/pages/ai-assistant/AiAssistantPage')
)
const MarketplacePage = lazy(
  () => import('@/pages/marketplace/MarketplacePage')
)

function Fallback() {
  const { t } = useTranslation('common')
  return (
    <div className="bg-desk-2 text-fg-muted flex min-h-svh items-center justify-center">
      <div role="status" className="flex items-center gap-3 text-sm">
        <span
          aria-hidden="true"
          className="border-border border-t-accent size-5 animate-spin rounded-full border-2 motion-reduce:animate-none"
        />
        <span>{t('loading')}</span>
      </div>
    </div>
  )
}

// Data router enables a real navigation blocker for unsaved input, including browser Back.
function RouteMotion() {
  const location = useLocation()
  // Fixed navigation and the sticky video hero must not have a transformed
  // ancestor from the app's page transition.
  if (location.pathname === '/') return <Outlet />
  return (
    <MotionPage replayKey={location.pathname}>
      <Outlet />
    </MotionPage>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      errorElement={<RouteErrorPage />}
      element={
        <Suspense fallback={<Fallback />}>
          <RouteMotion />
        </Suspense>
      }
    >
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/expert/register" element={<ExpertRegistrationPage />} />
      <Route path="/experts/:expertId" element={<ExpertPublicProfilePage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      {/* Explicit isolated demo; real Reviewer permissions/assignments need a server API. */}
      <Route path="/reviewer" element={<ReviewerLayout />}>
        <Route index element={<ReviewerQueuePage />} />
        <Route
          path="gate-1/:id"
          element={<ReviewerAssessmentPage gate="GATE_1" />}
        />
        <Route
          path="gate-2/:id"
          element={<ReviewerAssessmentPage gate="GATE_2" />}
        />
        <Route path="history" element={<ReviewerHistoryPage />} />
        <Route path="account" element={<AccountSettings role="reviewer" />} />
      </Route>
      {/* Production bắt buộc đăng nhập; TODO(auth): check role admin / Knowledge Admin khi BE có role */}
      <Route element={<StaffRoute />}>
        <Route path="/admin/experts" element={<AdminExpertsPage />} />
        <Route
          path="/admin/experts/pending"
          element={<AdminPendingExpertsPage />}
        />
        <Route
          path="/admin/experts/:id"
          element={<AdminApplicationDetailPage />}
        />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route
          path="/admin/disputes/:id"
          element={<AdminDisputeDetailPage />}
        />
        <Route path="/admin/escrow" element={<AdminEscrowPage />} />
        <Route path="/admin/pricing" element={<AdminPricingPage />} />
        <Route path="/admin/pricing/:id" element={<AdminPricingTierPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/account" element={<AdminAccountPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/knowledge" element={<KnowledgeDashboardPage />} />
        <Route path="/knowledge/queue" element={<KnowledgeQueuePage />} />
        <Route path="/knowledge/sources" element={<KnowledgeSourcesPage />} />
        <Route path="/knowledge/uploads" element={<KnowledgeUploadsPage />} />
        <Route path="/knowledge/account" element={<KnowledgeAccountPage />} />
        <Route
          path="/knowledge/templates"
          element={<KnowledgeTemplatesPage />}
        />
        <Route
          path="/knowledge/templates/new"
          element={<KnowledgeTemplateNewPage />}
        />
        <Route
          path="/knowledge/templates/:id"
          element={<KnowledgeTemplatePage />}
        />
        <Route
          path="/knowledge/documents"
          element={<KnowledgeDocumentsPage />}
        />
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
      </Route>

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
          <Route
            path="services/:serviceId/pricing"
            element={<ExpertPricingPage />}
          />
          <Route path="income" element={<ExpertIncomePage />} />
          <Route path="bio" element={<ExpertBioPage />} />
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
      <Route path="/ai-assistant" element={<AiAssistantPage/>}/>
      {/* Đường dẫn cũ (viết sai chính tả) giữ lại để link đã chia sẻ vẫn mở được */}
      <Route path="/ai-assitant" element={<Navigate to="/ai-assistant" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
)

export function AppRoutes() {
  return <RouterProvider router={router} />
}
