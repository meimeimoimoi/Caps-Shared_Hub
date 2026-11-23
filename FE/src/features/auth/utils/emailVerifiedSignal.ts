import { useEffect, useRef } from 'react'

const CHANNEL = 'caps-auth'
const STORAGE_KEY = 'caps-email-verified-at'
const MESSAGE = 'email-verified'
/** Kiểm tra định kỳ cho trường hợp bấm link trên thiết bị khác (không có tín hiệu giữa các tab) */
const POLL_MS = 20_000

/** Báo cho các tab khác của cùng trình duyệt rằng email vừa được xác nhận. */
export function notifyEmailVerified() {
  try {
    const channel = new BroadcastChannel(CHANNEL)
    channel.postMessage(MESSAGE)
    channel.close()
  } catch {
    // Trình duyệt cũ không có BroadcastChannel: dùng sự kiện storage bên dưới
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // Storage bị chặn: tab chờ vẫn tự kiểm tra khi được focus hoặc theo chu kỳ
  }
}

/**
 * Gọi `check` khi có dấu hiệu email đã được xác nhận: tín hiệu từ tab khác, người dùng quay lại tab,
 * hoặc định kỳ (bấm link trên điện thoại). `check` tự hỏi máy chủ nên gọi thừa cũng không sai.
 */
export function useEmailVerifiedSignal(check: () => void, active: boolean) {
  const latest = useRef(check)
  useEffect(() => {
    latest.current = check
  })

  useEffect(() => {
    if (!active) return
    const run = () => latest.current()
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(CHANNEL)
      channel.onmessage = (e) => {
        if (e.data === MESSAGE) run()
      }
    } catch {
      channel = null
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) run()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') run()
    }, POLL_MS)
    return () => {
      channel?.close()
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [active])
}
