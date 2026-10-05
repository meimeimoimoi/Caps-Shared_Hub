import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { useTheme } from '@/hooks/useTheme'
import { useRef, useState, useEffect } from 'react'
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'
import { isExpertDemo } from '@/lib/expert-data-source'
import { ExpertHeader } from './ExpertHeader'
import { ExpertSidebar } from './ExpertSidebar'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import './expert-theme.css'

const scenarioOptions = [
  { value: 'normal', label: 'Active workload' },
  { value: 'empty', label: 'Empty queue' },
  { value: 'partial', label: 'Partial failure' },
  { value: 'stale', label: 'Stale data' },
  { value: 'inconsistent', label: 'Version mismatch' },
  { value: 'error', label: 'Dashboard error' },
  { value: 'denied', label: 'Access denied' },
  { value: 'context-error', label: 'Access check error' },
]

export function ExpertLayout() {
  const location = useLocation()
  const drawer = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const [params, setParams] = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    return (localStorage.getItem('expert-lang') as 'vi' | 'en') || 'vi'
  })
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    localStorage.setItem('expert-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const close = () => drawer.current?.close()
  const open = () => {
    trigger.current = document.activeElement as HTMLElement
    drawer.current?.showModal()
  }

  return (
    <div
      className={`expert-portal ${isCollapsed ? 'ep-collapsed' : ''} ${isDark ? 'ep-dark' : ''}`}
    >
      <a className="ep-skip-link" href="#expert-main">
        Skip to overview
      </a>
      <aside className="ep-sidebar">
        <ExpertSidebar
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isCollapsed={isCollapsed}
        />
      </aside>
      <dialog
        ref={drawer}
        className="ep-drawer"
        aria-label="Expert Portal navigation"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect()
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              close()
          }
        }}
      >
        <ExpertSidebar close={close} />
      </dialog>
      <div className="ep-workspace">
        <ExpertHeader
          openNavigation={open}
          isDark={isDark}
          toggleTheme={toggleTheme}
          lang={lang}
          toggleLang={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        />
        {isExpertDemo && (
          <DemoBanner
            controls={
              <CustomSelect
                value={params.get('scenario') ?? 'normal'}
                onChange={(val) =>
                  setParams(val === 'normal' ? {} : { scenario: val })
                }
                options={scenarioOptions}
                label="Preview state"
                className="flex items-center gap-2"
                triggerClassName="!w-[180px] !text-sm"
              />
            }
          >
            <div>
              <strong className="mr-2">Demo workspace</strong>
              <span>Synthetic data · read-only · no server changes</span>
            </div>
          </DemoBanner>
        )}
        <main
          id="expert-main"
          className={`ep-main ${location.pathname === '/expert/overview' ? 'ep-main-overview max-w-450 [padding:32px_36px] max-[1251px]:[padding:28px_24px] max-[720px]:[padding:24px_16px]' : location.pathname.startsWith('/expert/settings/') ? 'mx-0 max-w-none p-6 max-md:p-4' : ''}`}
          tabIndex={-1}
        >
          <Outlet />
        </main>
        <footer className="ep-footer">
          Shared Hub · Expert Portal<span>Read-only overview</span>
        </footer>
      </div>
    </div>
  )
}
