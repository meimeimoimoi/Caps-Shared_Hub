import { ApiError } from '@/lib/api-client'
import type { ParseKeys } from 'i18next'
import english from '@/lib/i18n/locales/en/drafting.json'

/** Locale-independent UI failure; translate its key when rendering the error. */
export class DraftUiError extends ApiError {
  readonly translationKey: ParseKeys<'drafting'>
  constructor(key: ParseKeys<'drafting'>, status?: number) {
    super(english[key], status)
    this.translationKey = key
  }
}
