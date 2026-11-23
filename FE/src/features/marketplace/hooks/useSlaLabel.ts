import { useTranslation } from 'react-i18next'

/** Delivery SLA in calendar hours → "48 giờ" / "5 ngày" (whole days from 72h up). */
export function useSlaLabel() {
  const { t } = useTranslation('marketplace')
  return (hours: number) =>
    hours >= 72 && hours % 24 === 0
      ? t('sla.days', { count: hours / 24 })
      : t('sla.hours', { count: hours })
}
