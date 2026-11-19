import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'

const topics = ['deductible', 'invoice', 'rate', 'welfare'] as const

type AssistantWelcomeProps = {
  /** The question composer is the primary action in the empty state. */
  composer: ReactNode
  onSelectQuestion: (question: string) => void
}

/* Center the composer and suggested questions within the available conversation pane. */
export function AssistantWelcome({
  composer,
  onSelectQuestion,
}: AssistantWelcomeProps) {
  const { t } = useTranslation('aiAssistant')

  return (
    <section
      aria-labelledby="assistant-welcome-title"
      className="mx-auto my-auto flex w-full max-w-3xl shrink-0 flex-col gap-6 py-8 md:gap-8 md:py-12"
    >
      <MotionReveal
        preset="reveal"
        className="flex items-start justify-center gap-3 text-center"
      >
        <h1
          id="assistant-welcome-title"
          className="text-text-strong font-serif text-3xl leading-tight tracking-tight text-balance md:text-4xl"
        >
          {t('welcome.title')}
        </h1>
        <div className="mt-2 shrink-0">
          <HelpTip label={t('welcome.title')} className="[&>div]:right-0 [&>div]:left-auto">
            {t('welcome.lead')}
          </HelpTip>
        </div>
      </MotionReveal>

      <MotionReveal preset="reveal">{composer}</MotionReveal>

      <div className="flex flex-col gap-3">
        <h2 className="text-text-muted text-sm font-sans font-medium text-center">
          {t('welcome.topicsLabel')}
        </h2>
        {/* Suggestions fill the composer so the question can be edited before sending. */}
        <MotionStagger className="flex flex-wrap justify-center gap-2">
          {topics.map((topic) => (
            <MotionReveal key={topic} preset="reveal">
              <button
                type="button"
                title={t(`welcome.topics.${topic}.question`)}
                onClick={() =>
                  onSelectQuestion(t(`welcome.topics.${topic}.question`))
                }
                className="motion-interactive border-border bg-surface text-text hover:border-accent hover:text-text-strong focus-visible:ring-accent min-h-10 rounded-full border px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {t(`welcome.topics.${topic}.name`)}
              </button>
            </MotionReveal>
          ))}
        </MotionStagger>
      </div>
    </section>
  )
}
