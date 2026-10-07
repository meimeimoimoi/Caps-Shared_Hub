import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import logo from '@/assets/logo-full.png'
import brandMark from '@/assets/logo-icon.svg'
import { useTranslation } from 'react-i18next'

export interface SidebarItem {
  id: string
  to?: string
  label: string
  icon: ReactNode
  active?: boolean
  badge?: ReactNode
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
  onToggleCollapse?: () => void
  onNavigate?: () => void
  onClose?: () => void
}

/** Shared chrome only. Each layout owns routes, permissions and collapse state. */
export function AppSidebar({
  groups,
  navigationLabel,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const { t } = useTranslation('common')
  const navigationId = useId()
  return (
    <div className="on-ink flex min-h-0 flex-1 flex-col text-[var(--ui-sidebar-text)]">
      <div className="mb-9 flex shrink-0 items-center gap-2 px-1">
        {collapsed ? (
          <div className="flex min-h-11 w-full items-center justify-center">
            <img
              src={brandMark}
              alt="Shared Hub"
              width={36}
              height={41}
              className="h-[41px] w-9 shrink-0"
            />
          </div>
        ) : (
          <div className="relative h-11 min-w-0 flex-1 overflow-hidden rounded-md bg-white">
            <img
              src={logo}
              alt="Shared Hub"
              className="absolute top-1/2 left-1/2 h-auto w-[96%] max-w-none -translate-x-1/2 -translate-y-[50.5%]"
            />
          </div>
        )}
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
            {group.label &&
              (collapsed ? (
                <div
                  aria-hidden="true"
                  className="mx-auto my-4 h-px w-6 bg-white/15"
                />
              ) : (
                <h2 className="px-4 pt-6 pb-2 !font-sans text-[11px] !font-semibold !text-[var(--ui-sidebar-text)] uppercase">
                  {group.label}
                </h2>
              ))}
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
                    className={
                      collapsed ? 'sr-only' : 'min-w-0 flex-1 truncate'
                    }
                  >
                    {item.label}
                    {item.badge != null && collapsed && `, ${item.badge}`}
                  </span>
                  {item.badge != null &&
                    (collapsed ? (
                      <span
                        aria-hidden="true"
                        className="bg-indicator absolute top-2 right-2 size-2 rounded-full"
                      />
                    ) : (
                      <span className="bg-indicator ml-auto grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-semibold text-[var(--ui-on-accent)] tabular-nums">
                        {item.badge}
                      </span>
                    ))}
                </>
              )
              const className = `relative flex min-h-11 items-center gap-3 overflow-hidden rounded-[10px] py-3 text-sm whitespace-nowrap transition-colors focus-visible:!outline-white ${collapsed ? 'justify-center px-2' : 'px-3.5'} ${item.active ? 'bg-white/10 font-semibold !text-white before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r before:bg-[var(--ui-indicator)]' : 'font-medium !text-[var(--ui-sidebar-text)]'} ${item.to ? 'hover:bg-white/10 hover:!text-white' : 'w-full cursor-not-allowed text-left opacity-55'}`
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
                  title={item.label}
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
