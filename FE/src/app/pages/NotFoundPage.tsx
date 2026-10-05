import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, LayoutDashboard } from 'lucide-react'
import logo from '@/shared/assets/shared-hub-logo.png'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col bg-desk-2 px-[clamp(24px,5vw,80px)] text-fg-strong selection:bg-accent-soft selection:text-accent-text">
      <header className="flex min-h-20 items-center justify-between gap-6 border-b border-border md:min-h-[100px]">
        <Link to="/dashboard" className="relative block h-[34px] w-[150px] shrink-0 overflow-hidden md:h-[44px] md:w-[200px]" aria-label="Shared Hub dashboard">
          <img src={logo} alt="Shared Hub" className="absolute top-1/2 left-1/2 h-auto w-[108%] max-w-none -translate-x-1/2 -translate-y-[50.5%]" />
        </Link>
        <Link to="/login" className="inline-flex min-h-11 items-center gap-2 text-[14px] no-underline hover:text-accent-text">Sign in <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </header>

      <main className="m-auto grid w-full max-w-[460px] flex-1 grid-cols-1 items-center gap-8 py-12 md:max-w-[1080px] md:grid-cols-2 md:gap-[clamp(48px,7vw,112px)] md:py-20">
        <div className="font-serif text-[96px] leading-none tracking-[-0.04em] text-accent-text md:pb-10 md:text-[clamp(100px,15vw,240px)]" aria-hidden="true">404<span className="mt-5 block h-[3px] w-10 bg-accent md:mt-8 md:h-1 md:w-16" /></div>
        <section aria-labelledby="not-found-title">
          <h1 id="not-found-title" className="m-0 text-[38px] leading-[1.12] tracking-[-0.03em] text-balance md:text-[clamp(36px,4vw,56px)]">This page is<br />out of reach.</h1>
          <p className="mt-6 mb-8 max-w-[43ch] text-[16px] leading-[1.75] text-fg-muted">The page you’re looking for may have moved, or the link may be incorrect. Let’s get you back to your workspace.</p>
          <Link to="/dashboard" className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-control bg-accent px-5 py-3 text-[14px] font-semibold text-paper no-underline transition-colors duration-200 hover:bg-accent-hover active:bg-accent-active md:w-auto">
            <LayoutDashboard size={18} aria-hidden="true" /> Go to dashboard <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <div className="mt-8 flex flex-col items-start gap-2 border-t border-border pt-6 text-[14px] md:mt-10">
            <span className="text-fg-muted">Looking to join as an expert?</span>
            <Link to="/expert/register" className="inline-flex min-h-8 items-center gap-1.5 font-semibold underline decoration-border-control underline-offset-[5px] hover:text-accent-text hover:decoration-current">Expert registration <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="flex min-h-16 items-center justify-between gap-6 border-t border-border text-[12px] text-fg-muted md:min-h-[76px]">
        <span>Shared Hub</span>
        <span>404 · Page not found</span>
      </footer>
    </div>
  )
}
