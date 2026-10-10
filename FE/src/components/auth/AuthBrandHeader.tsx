import brandMark from '@/assets/logo-icon.svg'

/* Phần đầu chung của thẻ đăng nhập và thẻ đăng ký: cùng logo, cùng cỡ chữ, cùng khoảng cách.
 * Logo chỉ để trang trí vì tiêu đề đã có tên Shared Hub. */
export function AuthBrandHeader({ title }: { title: string }) {
  return (
    <div className="mb-6 text-center">
      <img
        src={brandMark}
        alt=""
        width={28}
        height={32}
        className="mx-auto mb-3 h-8 w-7"
      />
      <h1 className="font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.025em] text-white max-[420px]:text-[20px]">
        {title}
      </h1>
    </div>
  )
}

export default AuthBrandHeader
