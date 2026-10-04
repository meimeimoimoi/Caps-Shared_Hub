import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Inbox, FileStack, Briefcase, CreditCard, X, ChevronLeft, ChevronRight } from 'lucide-react'
import logo from '@/shared/assets/shared-hub-logo.png'

export function ExpertSidebar({ close, toggleCollapse, isCollapsed }: { close?: () => void, toggleCollapse?: () => void, isCollapsed?: boolean }) {
  const linkClass = ({ isActive }: { isActive: boolean }) => `ep-nav-link ${isActive ? 'active' : ''}`
  return <>
    <div className="ep-brand">
      {!isCollapsed && (
        <div className="ep-brand-logo-wrapper">
          <img src={logo} alt="Shared Hub Expert Portal" />
        </div>
      )}
      {isCollapsed && <div className="ep-brand-collapsed">SH</div>}
      {close && <button className="ep-icon-button" aria-label="Close navigation" onClick={close}><X size={20} aria-hidden="true" /></button>}
    </div>
    <nav aria-label="Expert Portal">
      <NavLink className={linkClass} to="/expert/overview" onClick={close} title="Overview"><LayoutDashboard size={18} aria-hidden="true" /><span>Overview</span></NavLink>
      <NavLink className={linkClass} to="/expert/queue" onClick={close} title="Work Queue"><Inbox size={18} aria-hidden="true" /><span>Work Queue</span></NavLink>
      <NavLink className={linkClass} to="/expert/active" onClick={close} title="Active Cases"><FileStack size={18} aria-hidden="true" /><span>Active Cases</span></NavLink>
      
      <div className="ep-nav-group-label" style={{ padding: '24px 16px 8px', fontSize: '11px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: '600' }}>Business</div>
      <NavLink className={linkClass} to="/expert/services" onClick={close} title="My Services"><Briefcase size={18} aria-hidden="true" /><span>My Services</span></NavLink>
      <span className="ep-nav-link" aria-disabled="true" title="Income preview is not available yet"><CreditCard size={18} aria-hidden="true" /><span>Income · Coming soon</span></span>
    </nav>
    {toggleCollapse && (
      <button className="ep-collapse-btn" onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={isCollapsed ? "Expand" : "Collapse"}>
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        {!isCollapsed && <span>Collapse</span>}
      </button>
    )}
  </>
}
