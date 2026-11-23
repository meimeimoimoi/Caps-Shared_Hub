import { useTranslation } from 'react-i18next'
import { AccountSettings } from '@/features/auth'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'

export default function KnowledgeAccountPage() {
  const nav = useKnowledgeNav()
  const { t } = useTranslation('auth')
  return (
    <KnowledgeLayout {...nav} section="account" breadcrumb={t('accountSettings.title')}>
      <AccountSettings role="knowledge" />
    </KnowledgeLayout>
  )
}
