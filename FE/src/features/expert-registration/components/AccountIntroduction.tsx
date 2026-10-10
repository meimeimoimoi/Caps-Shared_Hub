import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import brandMark from '@/assets/logo-icon.svg'
import expertPhoto from '@/features/home/assets/product-chuyen-gia.jpg'
import { AuthLanguageToggle } from '@/components/auth/AuthLanguageToggle'

const steps = ['account', 'dossier', 'gate1', 'gate2', 'pricing'] as const

/* Panel trái của trang đăng ký chuyên gia: luôn tối, dùng chung ảnh và tông màu với trang chủ.
 * Nêu rõ quy trình để chuyên gia biết trước công sức cần bỏ ra trước khi tạo tài khoản. */
export function AccountIntroduction() {
  const { t } = useTranslation('expertRegistration')

  return (
    <aside className="expert-signup-aside login-material">
      <img
        src={expertPhoto}
        alt=""
        aria-hidden="true"
        className="expert-signup-photo"
        width={1000}
        height={1250}
        fetchPriority="high"
      />
      <div className="expert-signup-aside-inner">
        <div className="expert-signup-topbar">
          <Link
            to="/"
            aria-label={t('page.home')}
            className="expert-signup-brand"
          >
            <img src={brandMark} alt="" width={28} height={32} />
            <span>Shared Hub</span>
          </Link>
          <AuthLanguageToggle />
        </div>

        <div className="expert-signup-pitch">
          <p className="expert-signup-eyebrow">{t('introduction.eyebrow')}</p>
          <h1>
            {t('introduction.heading')} <em>{t('introduction.impact')}</em>
          </h1>
          <p className="expert-signup-lead">{t('introduction.description')}</p>
        </div>

        <div className="expert-signup-process">
          <h2>{t('introduction.stepsTitle')}</h2>
          <ol>
            {steps.map((step, i) => (
              <li key={step} data-current={i === 0 || undefined}>
                <span className="expert-signup-step-index" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <strong>{t(`introduction.steps.${step}.title`)}</strong>
                  <span>{t(`introduction.steps.${step}.body`)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  )
}
