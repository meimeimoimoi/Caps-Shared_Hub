import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'

const topics = ['deductible', 'invoice', 'rate', 'welfare'] as const

type AssistantWelcomeProps = {
  onSelectQuestion: (question: string) => void
}

/* Trạng thái trống: mục lục chủ đề CIT thay cho hình minh họa. */
export function AssistantWelcome({ onSelectQuestion }: AssistantWelcomeProps) {
  const { t } = useTranslation('aiAssistant')

  return (
    <section
      aria-labelledby="assistant-welcome-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-8 md:gap-14 md:py-16"
    >
      <MotionReveal preset="reveal" className="flex flex-col gap-4">
        <p className="text-accent-text text-caption font-semibold tracking-[0.08em] uppercase">
          {t('welcome.eyebrow')}
        </p>
        <h1
          id="assistant-welcome-title"
          className="text-text-strong text-h1 md:text-hero font-serif tracking-tight text-balance"
        >
          {t('welcome.title')}
        </h1>
        <p className="text-text-muted text-doc max-w-xl text-pretty">
          {t('welcome.lead')}
        </p>
      </MotionReveal>

      <div className="flex flex-col gap-3">
        <h2 className="text-text-muted text-caption font-sans font-semibold tracking-[0.08em] uppercase">
          {t('welcome.topicsLabel')}
        </h2>
        {/* Mobile: dải cuộn ngang có snap; từ md: lưới 2 cột như mục lục */}
        <MotionStagger className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-0 md:overflow-visible md:px-0 md:pb-0">
          {topics.map((topic, index) => (
            <MotionReveal
              key={topic}
              preset="reveal"
              className="w-[78%] shrink-0 snap-start md:w-auto"
            >
              <button
                type="button"
                onClick={() =>
                  onSelectQuestion(t(`welcome.topics.${topic}.question`))
                }
                className="group motion-interactive border-border bg-surface hover:border-border-strong focus-visible:ring-accent flex h-full w-full flex-col gap-3 rounded-md border p-5 text-left focus-visible:ring-2 focus-visible:outline-none md:rounded-none md:border-0 md:border-t md:bg-transparent md:py-6 md:pr-8 md:pl-1 md:hover:bg-transparent"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-num text-text-muted text-caption tabular-nums">
                    {String(index + 1).padStart(2, '0')} ·{' '}
                    {t(`welcome.topics.${topic}.name`)}
                  </span>
                  <ArrowUpRight
                    size={16}
                    aria-hidden="true"
                    className="text-text-muted group-hover:text-accent-text shrink-0 transition-colors"
                  />
                </span>
                <span className="text-text-strong text-base leading-snug font-medium text-pretty">
                  {t(`welcome.topics.${topic}.question`)}
                </span>
              </button>
            </MotionReveal>
          ))}
        </MotionStagger>
      </div>
    </section>
  )
}
