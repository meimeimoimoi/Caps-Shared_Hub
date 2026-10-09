import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '@/lib/api-client'
import { ExpertBioView } from '@/features/expert-bio/ExpertBioView'
import { useExpertBio } from '@/features/expert-bio/useExpertBio'

export default function ExpertPublicProfilePage() {
  const { t } = useTranslation('expert')
  const { expertId } = useParams()
  const query = useExpertBio(expertId)
  const name = query.data?.displayName
  useEffect(() => {
    document.title = `${name ?? t('bio.publicTitle')} | Shared Hub`
  }, [name, t])

  return (
    <main className="bg-canvas text-fg min-h-svh px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        {query.isPending ? (
          <div
            role="status"
            aria-label={t('bio.loading')}
            className="border-border bg-paper h-96 animate-pulse rounded-xl border"
          />
        ) : query.data ? (
          <ExpertBioView bio={query.data} />
        ) : (
          <div className="border-border bg-paper rounded-xl border p-8">
            <h1 className="text-fg-strong text-xl font-semibold">
              {query.error instanceof ApiError && query.error.status === 404
                ? t('bio.notFound')
                : t('bio.unavailable')}
            </h1>
            <p className="text-fg-muted mt-2 text-sm">
              {t('bio.unavailableMessage')}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
              <button
                className="text-accent-text hover:underline"
                onClick={() => void query.refetch()}
              >
                {t('retry')}
              </button>
              <Link
                className="text-accent-text hover:underline"
                to="/dashboard"
              >
                {t('backToDashboard')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
