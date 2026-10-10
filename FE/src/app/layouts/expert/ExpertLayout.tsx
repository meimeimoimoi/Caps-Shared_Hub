import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { useTheme } from '@/hooks/useTheme'
import { useRef, useState } from 'react'
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'
import { isExpertDemo } from '@/lib/expert-data-source'
import { ExpertHeader } from './ExpertHeader'
import { ExpertSidebar } from './ExpertSidebar'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import './expert-theme.css'
import { useTranslation } from 'react-i18next'
import { useDialogMotion } from '@/components/ui/motion'

const scenarioOptions = [
  { value: 'normal', key: 'demo.scenarios.normal' },
  { value: 'empty', key: 'demo.scenarios.empty' },
  { value: 'partial', key: 'demo.scenarios.partial' },
  { value: 'stale', key: 'demo.scenarios.stale' },
  { value: 'inconsistent', key: 'demo.scenarios.inconsistent' },
  { value: 'error', key: 'demo.scenarios.error' },
  { value: 'denied', key: 'demo.scenarios.denied' },
  { value: 'context-error', key: 'demo.scenarios.contextError' },
] as const

export function ExpertLayout() {
  const { t } = useTranslation(['common', 'navigation'])
  const location = useLocation()
  const interactivePricing = /^\/expert\/services\/[^/]+\/pricing$/.test(
    location.pathname
  )
  const drawer = useRef<HTMLDialogElement>(null)
  useDialogMotion(drawer, 'drawer-left')
  const trigger = useRef<HTMLElement | null>(null)
  const [params, setParams] = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isDark } = useTheme()

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
        {t('navigation.skipOverview')}
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
        aria-label={t('navigation:expertNavigation')}
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
        <ExpertHeader openNavigation={open} />
        {isExpertDemo && (
          <DemoBanner
            controls={
              <CustomSelect
                value={params.get('scenario') ?? 'normal'}
                onChange={(val) =>
                  setParams(val === 'normal' ? {} : { scenario: val })
                }
                options={scenarioOptions.map(({ value, key }) => ({
                  value,
                  label: t(key),
                }))}
                label={t('demo.previewState')}
                className="flex items-center gap-2"
                triggerClassName="!w-[180px] !text-sm"
              />
            }
          >
            <div>
              <strong className="mr-2">{t('demo.workspace')}</strong>
              <span>
                {t(interactivePricing ? 'demo.interactive' : 'demo.readOnly')}
              </span>
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
          {t('demo.footer')}
          <span>
            {t(
              interactivePricing ? 'demo.interactive' : 'demo.overviewReadOnly'
            )}
          </span>
        </footer>
      </div>
    </div>
  )
}
