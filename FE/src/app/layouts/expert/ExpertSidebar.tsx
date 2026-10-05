import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Inbox, FileStack, Briefcase, CreditCard, X, ChevronLeft, ChevronRight } from 'lucide-react'
import logo from '@/assets/shared-hub-logo.png'
import brandMark from '@/assets/shared-hub-mark.svg'

export function ExpertSidebar({ close, toggleCollapse, isCollapsed }: { close?: () => void, toggleCollapse?: () => void, isCollapsed?: boolean }) {
  const linkClass = ({ isActive }: { isActive: boolean }) => `ep-nav-link ${isActive ? 'active' : ''}`
  return <>
    <div className="ep-brand">
      {!isCollapsed && (
        <div className="relative h-11 w-full overflow-hidden rounded-md bg-white">
          <img src={logo} alt="Shared Hub Expert Portal" className="absolute top-1/2 left-1/2 h-auto w-[96%] max-w-none -translate-x-1/2 -translate-y-[50.5%]" />
        </div>
      )}
      {isCollapsed && <div className="flex min-h-11 w-full items-center justify-center"><img src={brandMark} alt="Shared Hub" width={36} height={41} className="h-[41px] w-9 shrink-0" /></div>}
      {close && <button className="ep-icon-button" aria-label="Close navigation" onClick={close}><X size={20} aria-hidden="true" /></button>}
    </div>
    <nav aria-label="Expert Portal">
      <NavLink className={linkClass} to="/expert/overview" onClick={close} title="Overview"><LayoutDashboard size={18} aria-hidden="true" /><span>Overview</span></NavLink>
      <NavLink className={linkClass} to="/expert/queue" onClick={close} title="Work Queue"><Inbox size={18} aria-hidden="true" /><span>Work Queue</span></NavLink>
      <NavLink className={linkClass} to="/expert/active" onClick={close} title="Active Cases"><FileStack size={18} aria-hidden="true" /><span>Active Cases</span></NavLink>
      
      {isCollapsed ? <div aria-hidden="true" className="mx-auto my-4 h-px w-6 bg-white/15" /> : <div className="px-4 pt-6 pb-2 text-[11px] font-semibold text-[#a1a1aa] uppercase">Business</div>}
      <NavLink className={linkClass} to="/expert/services" onClick={close} title="My Services"><Briefcase size={18} aria-hidden="true" /><span>My Services</span></NavLink>
      <NavLink className={linkClass} to="/expert/income" onClick={close} title="Income"><CreditCard size={18} aria-hidden="true" /><span>Income</span></NavLink>
    </nav>
    {toggleCollapse && (
      <button className="mt-auto flex size-11 shrink-0 cursor-pointer items-center justify-center self-center rounded-lg border-0 bg-transparent text-[var(--ep-sidebar-text)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ep-accent)]" onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!isCollapsed} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {isCollapsed ? <ChevronRight size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}
      </button>
    )}
  </>
}

