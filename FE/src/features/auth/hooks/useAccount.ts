import { useAuthStore } from '../store/authStore'
import { useDemoAccountStore } from '../store/demoAccountStore'
import { useAuth } from './useAuth'

/* MOCK: TODO(auth) tài khoản minh họa cho các vai trò chưa có đăng nhập thật */
export const DEMO_ACCOUNTS = {
  admin: { name: 'Trần An', email: 'tran.an@shft.vn' },
  knowledge: { name: 'Lê Thu Hà', email: 'thuha.le@shft.vn' },
  // Expert có dữ liệu thật từ useExpertContext; mục này chỉ dùng khi thiếu context
  expert: { name: 'Đặng Mỹ Linh', email: 'linh.dang@outlook.com' },
} as const
export type AccountRole = keyof typeof DEMO_ACCOUNTS

/** Thông tin tài khoản đang dùng: user đăng nhập thật, hoặc tài khoản minh họa của vai trò.
 * Header và trang Tài khoản dùng chung nên đổi ảnh ở trang là header đổi theo. */
export function useAccount(role: AccountRole) {
  const { user, logout } = useAuth()
  const updateUser = useAuthStore((s) => s.updateUser)
  const demoAvatar = useDemoAccountStore((s) => s.avatarUrl)
  const setDemoAvatar = useDemoAccountStore((s) => s.setAvatarUrl)
  const demo = DEMO_ACCOUNTS[role]

  return {
    isDemo: !user,
    name: user?.name ?? demo.name,
    email: user?.email ?? demo.email,
    avatarUrl: user ? user.avatarUrl : demoAvatar,
    /** null = gỡ ảnh */
    saveAvatar: (url: string | null) =>
      user ? updateUser({ avatarUrl: url ?? undefined }) : setDemoAvatar(url ?? undefined),
    /** Không có user thật thì không có gì để đăng xuất */
    logout: user ? logout : undefined,
  }
}
