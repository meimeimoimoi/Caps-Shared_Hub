/** A plain string is a success message; errors are tagged so they never wear a check mark */
export type ToastContent = string | { text: string; tone: 'error' }

export const errorToast = (text: string): ToastContent => ({
  text,
  tone: 'error',
})
