export interface FormValidationResult {
  errors: Record<string, string>
  firstInvalid: HTMLElement | null
}

/** Collect native constraints without showing the browser validation popup. */
export function collectFormErrors(form: HTMLFormElement): FormValidationResult {
  const errors: Record<string, string> = {}
  let firstInvalid: HTMLElement | null = null
  for (const element of Array.from(form.elements)) {
    if (!(
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ))
      continue
    if (!element.willValidate || element.validity.valid || !element.name)
      continue
    firstInvalid ??= element
    const validity = element.validity
    errors[element.name] = validity.valueMissing
      ? 'This field is required.'
      : validity.typeMismatch
        ? element instanceof HTMLInputElement && element.type === 'email'
          ? 'Please enter a valid email address.'
          : 'Please enter a valid value.'
        : validity.rangeUnderflow && element instanceof HTMLInputElement
          ? `Value must be at least ${element.min}.`
          : validity.rangeOverflow && element instanceof HTMLInputElement
            ? `Value must be at most ${element.max}.`
            : validity.customError
              ? element.validationMessage
              : 'Invalid value.'
  }
  return { errors, firstInvalid }
}

/** Call after rendering errors so custom controls can be found too. */
export function focusInvalidField(
  form: HTMLFormElement,
  firstInvalid?: HTMLElement | null
) {
  const target =
    firstInvalid ??
    form.querySelector<HTMLElement>(
      '[aria-invalid="true"] input, input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], button[aria-invalid="true"]'
    )
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'center',
  })
}
