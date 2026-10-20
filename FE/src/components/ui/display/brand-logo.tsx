import logo from '@/assets/logo-full.png'
import { cn } from '@/lib/utils'

/* Logo đầy đủ Shared Hub. Chữ "SHARED" màu tối nên cần tấm nền sáng trên nền tối:
 * - plate="auto": chỉ có tấm nền ở theme tối (header trang, trang lỗi)
 * - plate="always": luôn có tấm nền (sidebar luôn tối)
 * Kích thước khung do nơi dùng quyết định qua className (vd. "h-11 w-[200px]"). */
export function BrandLogo({
  plate = 'auto',
  className,
}: {
  plate?: 'auto' | 'always'
  className?: string
}) {
  return (
    <span className={cn('brand-logo', className)} data-plate={plate}>
      <img src={logo} alt="Shared Hub" width={1774} height={887} />
    </span>
  )
}
