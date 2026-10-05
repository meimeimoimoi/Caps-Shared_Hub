import { useRef, useState, useEffect } from 'react'
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
import { ExpertHeader } from './ExpertHeader'
import { ExpertSidebar } from './ExpertSidebar'
import { CustomSelect } from '@/shared/ui/custom-select'
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
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('expert-theme') === 'dark' ||
      (!localStorage.getItem('expert-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    localStorage.setItem('expert-theme', isDark ? 'dark' : 'light')
  }, [isDark])

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
    <div className={`expert-portal ${isCollapsed ? 'ep-collapsed' : ''} ${isDark ? 'ep-dark' : ''}`}>
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
          toggleTheme={() => setIsDark(!isDark)}
          lang={lang}
          toggleLang={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        />
        {isExpertDemo && (
          <div className="ep-demo">
            <div>
              <strong>Demo workspace</strong>
              <span>Synthetic data · read-only · no server changes</span>
            </div>
            <CustomSelect
              value={params.get('scenario') ?? 'normal'}
              onChange={(val) =>
                setParams(val === 'normal' ? {} : { scenario: val })
              }
              options={scenarioOptions}
              label="Preview state"
              className="flex items-center gap-2"
              triggerClassName="!min-h-[34px] !py-1 !text-xs !w-[180px]"
            />
          </div>
        )}
        <main
          id="expert-main"
          className={`ep-main ${location.pathname === '/expert/overview' ? 'ep-main-overview max-w-450 [padding:32px_36px] max-[1251px]:[padding:28px_24px] max-[720px]:[padding:24px_16px]' : location.pathname.startsWith('/expert/settings/') ? 'max-w-none mx-0 p-6 max-md:p-4' : ''}`}
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
