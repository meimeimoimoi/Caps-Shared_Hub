import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// MOCK: TODO(auth) các vai trò quản trị chưa có đăng nhập thật. Ảnh đại diện của tài khoản
// minh họa lưu ở đây (theo trình duyệt) để header và trang Tài khoản cập nhật cùng lúc.
// Khi đăng nhập thật, ảnh nằm trong authStore.user.avatarUrl và store này không còn dùng.
interface DemoAccountStore {
  avatarUrl?: string
  setAvatarUrl: (url: string | undefined) => void
}

export const useDemoAccountStore = create<DemoAccountStore>()(
  persist((set) => ({ setAvatarUrl: (avatarUrl) => set({ avatarUrl }) }), {
    name: 'shared-hub-demo-account',
  })
)
