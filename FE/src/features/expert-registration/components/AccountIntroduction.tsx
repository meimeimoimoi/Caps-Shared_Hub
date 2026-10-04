import { ShieldCheck } from 'lucide-react'
import expertPhoto from '../assets/expert-collaboration.png'

export function AccountIntroduction() {
  return (
    <section className="expert-introduction">
      <h1>Bring your expertise.<br /><em>Make a difference.</em></h1>
      <p className="expert-intro-copy">Join Shared Hub as a tax and accounting expert and share your knowledge with a wider community.</p>
      <figure className="expert-photo">
        <img src={expertPhoto} alt="Two tax and accounting professionals working together over financial documents in a sunlit office" width={1536} height={1024} fetchPriority="high" />
      </figure>
      <div className="expert-review-note"><ShieldCheck size={22} aria-hidden="true" /><p>Expert approval includes eligibility and service-specific competency reviews.</p></div>
    </section>
  )
}
