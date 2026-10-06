import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Toast do trang trước gửi qua navigate(..., { state: { toast } }).
 * Đọc xong thì xóa state để không hiện lại khi tải lại trang hoặc bấm Back. */
export function useNavToast() {
  const location = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null
  )
  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    // Giữ nguyên query string (vd. ?stage=failed), chỉ bỏ state
    if (location.state)
      navigate({ pathname: location.pathname, search: location.search }, { replace: true })
  }, [location.state, location.pathname, location.search, navigate])

  return { toast, setToast, clearToast }
}
