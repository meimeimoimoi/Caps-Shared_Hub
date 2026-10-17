import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'

const topics = ['deductible', 'invoice', 'rate', 'welfare'] as const

type AssistantWelcomeProps = {
  /** Ô hỏi đặt giữa trang: hành động chính của màn hình trống */
  composer: ReactNode
  onSelectQuestion: (question: string) => void
}

/* Trạng thái trống kiểu "bàn tra cứu": ô hỏi là trung tâm, gợi ý xếp ngay dưới; lịch sử nằm ở cột riêng. */
export function AssistantWelcome({
  composer,
  onSelectQuestion,
}: AssistantWelcomeProps) {
  const { t } = useTranslation('aiAssistant')

  return (
    <section
      aria-labelledby="assistant-welcome-title"
      className="mx-auto flex w-full max-w-2xl flex-col gap-8 pt-7 pb-10 md:gap-9 md:pt-7 md:pb-14"
    >
      <MotionReveal
        preset="reveal"
        className="flex flex-col gap-3 md:items-center md:text-center"
      >
        <h1
          id="assistant-welcome-title"
          className="text-text-strong text-h1 font-serif tracking-tight text-balance md:text-[2.5rem] md:leading-tight"
        >
          {t('welcome.title')}
        </h1>
        <p className="text-text-muted flex items-start gap-2 text-pretty md:items-center">
          <ShieldCheck
            size={17}
            aria-hidden="true"
            className="text-accent-text mt-0.5 shrink-0 md:mt-0"
          />
          {t('welcome.lead')}
        </p>
      </MotionReveal>

      <MotionReveal preset="reveal">{composer}</MotionReveal>

      <div className="flex flex-col gap-3">
        <h2 className="text-text-muted text-caption font-sans font-semibold tracking-[0.08em] uppercase md:text-center">
          {t('welcome.topicsLabel')}
        </h2>
        {/* Gợi ý: chip gọn, bấm là điền sẵn câu hỏi mẫu vào ô hỏi để người dùng sửa trước khi gửi */}
        <MotionStagger className="flex flex-wrap gap-2 md:justify-center">
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
