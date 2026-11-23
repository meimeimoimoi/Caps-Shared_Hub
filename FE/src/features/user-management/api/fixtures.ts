/* Dữ liệu demo cho usersApi.ts khi chạy dev (isExpertDemo).
 * Tên trùng với tài khoản minh họa và dữ liệu mẫu ở các màn khác để demo khớp nhau. */
import type { ManagedUser } from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()
const u = (
  id: string,
  name: string,
  email: string,
  role: ManagedUser['role'],
  createdDays: number,
  lastLoginDays: number | null
): ManagedUser => ({
  id,
  name,
  email,
  role,
  status: 'ACTIVE',
  createdAt: daysAgo(createdDays),
  lastLoginAt: lastLoginDays === null ? null : daysAgo(lastLoginDays),
  history: [
    { at: daysAgo(createdDays), actor: 'Hệ thống', text: 'Tạo tài khoản' },
  ],
})

export const mockUsers: ManagedUser[] = [
  u('u-admin-1', 'Trần An', 'tran.an@shft.vn', 'SYSTEM_ADMIN', 420, 0),
  u('u-ka-1', 'Lê Thu Hà', 'thuha.le@shft.vn', 'KNOWLEDGE_ADMIN', 380, 1),
  u('u-rv-1', 'Hoàng Minh Đức', 'duc.hoang@shft.vn', 'REVIEWER', 260, 2),
  u('u-rv-2', 'Ngô Bảo Châu Anh', 'chauanh.ngo@shft.vn', 'REVIEWER', 190, 9),
  u('u-ex-1', 'Đặng Mỹ Linh', 'linh.dang@outlook.com', 'EXPERT', 240, 0),
  u('u-ex-2', 'Phan Quốc Bảo', 'bao.phan@ketoanbao.vn', 'EXPERT', 210, 3),
  u('u-ex-3', 'Võ Thanh Tùng', 'tung.vo@gmail.com', 'EXPERT', 150, 1),
  u('u-ex-4', 'Lý Gia Hân', 'giahan.ly@thuevietpro.vn', 'EXPERT', 60, 21),
  u(
    'u-cl-1',
    'Công ty TNHH Cơ khí Tân Tiến',
    'ketoan@tantien-cokhi.vn',
    'CLIENT',
    120,
    0
  ),
  u(
    'u-cl-2',
    'Công ty CP Nông sản Mekong',
    'taichinh@mekongagri.vn',
    'CLIENT',
    95,
    2
  ),
  u(
    'u-cl-3',
    'Nguyễn Thị Hồng Nhung',
    'hongnhung.ng@gmail.com',
    'CLIENT',
    70,
    6
  ),
  u(
    'u-cl-4',
    'Công ty TNHH Thép Nam Á',
    'ketoan@thepnama.com.vn',
    'CLIENT',
    55,
    4
  ),
  u('u-cl-5', 'Trịnh Văn Khôi', 'khoi.trinh.88@gmail.com', 'CLIENT', 12, null),
  {
    ...u(
      'u-cl-6',
      'Công ty TNHH Sao Mai Logistics',
      'admin@saomai-log.vn',
      'CLIENT',
      140,
      33
    ),
    status: 'LOCKED',
    lockReason:
      'Nhiều lần thanh toán bị hoàn, đang chờ xác minh thông tin doanh nghiệp.',
    history: [
      {
        at: daysAgo(30),
        actor: 'Trần An',
        text: 'Khóa tài khoản: Nhiều lần thanh toán bị hoàn, đang chờ xác minh thông tin doanh nghiệp.',
      },
      { at: daysAgo(140), actor: 'Hệ thống', text: 'Tạo tài khoản' },
    ],
  },
]
