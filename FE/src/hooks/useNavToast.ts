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
    if (location.state) navigate(location.pathname, { replace: true })
  }, [location.state, location.pathname, navigate])

  return { toast, setToast, clearToast }
}
