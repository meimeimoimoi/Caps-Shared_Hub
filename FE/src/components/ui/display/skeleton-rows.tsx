import { useTranslation } from 'react-i18next'

/* Dòng khung xương cho bảng khi đang tải lần đầu, đúng số cột để bảng không giật khi dữ liệu về.
 * Cột `wide` (thường là cột tên) dài hơn cho giống dữ liệu thật. Trình đọc màn hình chỉ nghe "Đang tải…". */
export function SkeletonRows({
  cols,
  wide = 1,
  rows = 4,
}: {
  cols: number
  wide?: number
  rows?: number
}) {
  const { t } = useTranslation('common')
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr
          key={i}
          aria-hidden="true"
          className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-4"
        >
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <span
                className="bg-sunken block h-3 rounded motion-safe:animate-pulse"
                style={{ width: c === wide ? '80%' : '55%' }}
              />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only">
        <td role="status">{t('loading')}</td>
      </tr>
    </>
  )
}
