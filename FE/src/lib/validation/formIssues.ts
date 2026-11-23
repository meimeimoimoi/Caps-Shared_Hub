export type FormIssueCode = 'required' | 'email' | 'validValue' | 'minimum' | 'maximum' | 'invalid'
export interface FormIssue { code: FormIssueCode; params?: Record<string, string | number> }

/** Native constraints represented as codes, independent of the browser's UI language. */
export function collectFormIssues(form: HTMLFormElement) {
  const errors: Record<string, FormIssue> = {}
  let firstInvalid: HTMLElement | null = null
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue
    if (!element.willValidate || element.validity.valid || !element.name) continue
    firstInvalid ??= element
    const validity = element.validity
    errors[element.name] = validity.valueMissing ? { code: 'required' }
      : validity.typeMismatch ? { code: element instanceof HTMLInputElement && element.type === 'email' ? 'email' : 'validValue' }
      : validity.rangeUnderflow && element instanceof HTMLInputElement ? { code: 'minimum', params: { minimum: element.min } }
      : validity.rangeOverflow && element instanceof HTMLInputElement ? { code: 'maximum', params: { maximum: element.max } }
      : { code: 'invalid' }
  }
  return { errors, firstInvalid }
}
