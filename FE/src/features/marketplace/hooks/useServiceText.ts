import { useTranslation } from 'react-i18next'

// Services with their own copy in the marketplace locale; others fall back to the catalog name.
const KNOWN = [
  'cit-review',
  'cit-compliance',
  'cit-consultation',
  'HUMAN_VERIFICATION',
] as const
type KnownService = (typeof KNOWN)[number]
const isKnown = (id: string): id is KnownService =>
  KNOWN.includes(id as KnownService)

export function useServiceText() {
  const { t } = useTranslation('marketplace')
  return {
    name: (id: string, fallback: string) =>
      isKnown(id) ? t(`services.${id}.name`) : fallback,
    deliverable: (id: string) =>
      isKnown(id) ? t(`services.${id}.deliverable`) : null,
  }
}
