import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Sets the browser tab title as "<page> | <app name>" from the common locale. */
export function usePageTitle(page: string | undefined) {
  const { t } = useTranslation('common')
  useEffect(() => {
    if (page) document.title = t('pageTitle', { page })
  }, [page, t])
}
