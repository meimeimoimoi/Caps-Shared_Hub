import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { BrandLogo } from '@/components/ui/display/brand-logo'
import brandMark from '@/assets/logo-icon.svg'
import { useTranslation } from 'react-i18next'

export interface SidebarItem {
  id: string
  to?: string
  label: string
  icon: ReactNode
  active?: boolean
  badge?: ReactNode
  /** Locked item (no `to`): shows a lock and explains when it opens */
  lockedHint?: string
}
export interface SidebarGroup {
  id: string
  label?: string
  items: SidebarItem[]
}
interface AppSidebarProps {
  groups: SidebarGroup[]
  navigationLabel: string
  collapsed?: boolean
  badgeVariant?: 'accent' | 'muted'
  onToggleCollapse?: () => void
  onNavigate?: () => void
  onClose?: () => void
}

/** Shared chrome only. Each layout owns routes, permissions and collapse state. */
export function AppSidebar({
  groups,
  navigationLabel,
  collapsed = false,
  badgeVariant = 'accent',
  onToggleCollapse,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const { t } = useTranslation('common')
  const navigationId = useId()
  return (
    <div className="on-ink flex min-h-0 flex-1 flex-col text-[var(--ui-sidebar-text)]">
      <div className="mb-9 flex shrink-0 items-center gap-2 px-1">
        {/* Logo về landing page. Hai logo chồng nhau và mờ chéo theo chiều rộng sidebar (sidebar-rail) */}
        <Link
          to="/"
          onClick={onNavigate}
          aria-label={t('navigation.home')}
          className="rounded-control relative h-11 min-w-0 flex-1 overflow-hidden transition-opacity hover:opacity-85"
        >
          <span
            aria-hidden={collapsed}
            className={`sidebar-fade absolute inset-y-0 left-0 ${collapsed ? 'opacity-0' : 'opacity-100'}`}
          >
            <BrandLogo plate="always" className="h-11 w-[200px] rounded-md" />
          </span>
          <img
            src={brandMark}
            alt={collapsed ? 'Shared Hub' : ''}
            aria-hidden={!collapsed}
            width={36}
            height={41}
            className={`sidebar-fade absolute top-px left-1/2 h-[41px] w-9 -translate-x-1/2 ${collapsed ? 'opacity-100' : 'opacity-0'}`}
          />
        </Link>
        {onClose && (
          <button
            type="button"
            aria-label={t('navigation.close')}
            onClick={onClose}
            className="rounded-control flex size-11 shrink-0 items-center justify-center hover:bg-white/10 hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      <nav
        id={navigationId}
        aria-label={navigationLabel}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {groups.map((group) => (
          <div key={group.id} className="space-y-0.5">
            {group.label && (
              <div className="relative h-12">
                <span
                  aria-hidden="true"
                  className={`sidebar-fade absolute top-1/2 left-1/2 h-px w-6 -translate-x-1/2 bg-white/15 ${collapsed ? 'opacity-100' : 'opacity-0'}`}
                />
                <h2
                  className={`sidebar-fade absolute bottom-2 left-0 px-4 !font-sans text-[11px] !font-semibold whitespace-nowrap !text-[var(--ui-sidebar-text)] uppercase ${collapsed ? 'sr-only' : 'opacity-100'}`}
                >
                  {group.label}
                </h2>
              </div>
            )}
            {group.items.map((item) => {
              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center"
                  >
                    {item.icon}
                  </span>
                  <span
                    // Rộng cố định để chữ không xô khi thu/mở; có badge thì chừa chỗ bên phải cho nó.
                    className={`sidebar-fade line-clamp-2 w-[148px] shrink-0 leading-snug whitespace-normal ${item.badge != null ? 'pr-10' : ''} ${collapsed ? 'opacity-0' : 'opacity-100'}`}
                  >
                    {item.label}
                    {item.badge != null && collapsed && `, ${item.badge}`}
                    {item.lockedHint && (
                      <span className="sr-only">. {item.lockedHint}</span>
                    )}
                  </span>
                  {item.lockedHint && !collapsed && (
                    <Lock
                      size={14}
                      aria-hidden="true"
                      className="absolute top-1/2 right-3.5 -translate-y-1/2"
                    />
                  )}
                  {item.badge != null &&
                    (collapsed ? (
                      <span
                        aria-hidden="true"
                        className="bg-indicator absolute top-2 right-2 size-2 rounded-full"
                      />
                    ) : (
                      <span className={`absolute top-1/2 right-3.5 inline-flex h-5 min-w-6 -translate-y-1/2 items-center justify-center px-1.5 font-sans text-[11px] leading-none font-medium tabular-nums ${badgeVariant === 'muted' ? 'bg-indicator rounded-md text-[var(--ui-on-accent)]' : 'bg-indicator rounded-full text-[var(--ui-on-accent)]'}`}>
                        {item.badge}
                      </span>
                    ))}
                </>
              )
              const className = `relative flex min-h-11 items-center gap-3 overflow-hidden rounded-[10px] py-3 text-sm whitespace-nowrap transition-[color,background-color,padding] duration-[var(--motion-exit)] ease-[var(--motion-ease-enter)] focus-visible:!outline-white ${collapsed ? 'pr-2 pl-[18px]' : 'px-3.5'} ${item.active ? 'bg-white/10 font-semibold !text-white before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r before:bg-[var(--ui-indicator)]' : 'font-medium !text-[var(--ui-sidebar-text)]'} ${item.to ? 'hover:bg-white/10 hover:!text-white' : 'w-full cursor-not-allowed text-left opacity-55'}`
              return item.to ? (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={onNavigate}
                  title={item.label}
                  aria-current={item.active ? 'page' : undefined}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  disabled
                  title={item.lockedHint ?? item.label}
                  className={className}
                >
                  {content}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      {onToggleCollapse && (
        <div className="flex shrink-0 justify-center pt-6">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={t(
              collapsed ? 'navigation.expand' : 'navigation.collapse'
            )}
            title={t(collapsed ? 'navigation.expand' : 'navigation.collapse')}
            aria-expanded={!collapsed}
            aria-controls={navigationId}
            className="rounded-control flex size-11 items-center justify-center transition-colors hover:bg-white/10 hover:text-white focus-visible:!outline-white"
          >
            {collapsed ? (
              <PanelLeftOpen size={20} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
