import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/* Minimal typing for the parts of Google Identity Services used here. */
type GoogleCredentialResponse = { credential: string }
type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
// Google's button accepts a pixel width of at most 400
const MAX_BUTTON_WIDTH = 400

let scriptPromise: Promise<GoogleAccountsId> | null = null
let initialized = false
// Only one sign-in card is mounted at a time; the mounted button owns the callback
let activeHandler: ((idToken: string) => void) | null = null

function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  scriptPromise ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.google?.accounts?.id
        ? resolve(window.google.accounts.id)
        : reject(new Error('Google Identity Services did not load'))
    script.onerror = () =>
      reject(new Error('Google Identity Services did not load'))
    document.head.appendChild(script)
  }).catch((e: unknown) => {
    // Allow a later mount to try again (e.g. after a network blip)
    scriptPromise = null
    throw e
  })
  return scriptPromise
}

export type GoogleSignInButtonProps = {
  /** Receives the Google ID token (credential) to exchange with the auth service. */
  onCredential: (idToken: string) => void
  /**
   * Our styled button. Google's button is laid invisibly on top of it to take the click; without a client id
   * or when the script cannot load, this button is used as is (its own onClick handles that case).
   */
  children: ReactNode
  disabled?: boolean
  className?: string
}

/** Google Identity Services button, which returns an ID token without redirecting, styled like the rest of the card. */
export function GoogleSignInButton({
  onCredential,
  children,
  disabled = false,
  className,
}: GoogleSignInButtonProps) {
  const { i18n } = useTranslation()
  const slot = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(
    'loading'
  )

  useEffect(() => {
    activeHandler = onCredential
    return () => {
      if (activeHandler === onCredential) activeHandler = null
    }
  }, [onCredential])

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false
    loadGoogleIdentity()
      .then((gis) => {
        const parent = slot.current
        if (cancelled || !parent) return
        if (!initialized) {
          gis.initialize({
            client_id: CLIENT_ID,
            callback: (response) => activeHandler?.(response.credential),
            ux_mode: 'popup',
            auto_select: false,
            cancel_on_tap_outside: true,
          })
          initialized = true
        }
        // Re-render on language change, replacing the previous button
        parent.replaceChildren()
        gis.renderButton(parent, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(
            MAX_BUTTON_WIDTH,
            parent.offsetWidth || MAX_BUTTON_WIDTH
          ),
          locale: i18n.language,
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })
    return () => {
      cancelled = true
    }
  }, [i18n.language])

  if (!CLIENT_ID || status === 'failed') return <>{children}</>

  return (
    <div
      aria-busy={status === 'loading'}
      className={cn(
        'group relative w-full',
        disabled && 'pointer-events-none',
        className
      )}
    >
      {/* Visual only: the pointer and keyboard reach Google's iframe, so mirror its hover/focus here */}
      <div
        inert
        className="group-focus-within:[&_button]:outline-2 group-focus-within:[&_button]:outline-offset-[3px] group-focus-within:[&_button]:outline-[var(--accent)] group-hover:[&_button]:border-white/22 group-hover:[&_button]:bg-white/[0.09] group-active:[&_button]:scale-[.995]"
      >
        {children}
      </div>
      {/* Google renders a 40px button; stretch it slightly to cover the whole 44px button.
       * A light color scheme stops the iframe from painting a white backdrop on dark pages. */}
      <div
        ref={slot}
        className="absolute inset-0 flex scale-y-110 items-center justify-center overflow-hidden [color-scheme:light] opacity-0"
      />
    </div>
  )
}

export default GoogleSignInButton
