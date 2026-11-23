import type { ParseKeys } from 'i18next'

export interface RegistrationMessage {
  key: ParseKeys<'expertRegistration'>
  params?: Record<string, string | number>
}
