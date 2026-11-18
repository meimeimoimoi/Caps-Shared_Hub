export const fieldText = (v: unknown) =>
  typeof v === 'string' ? v : JSON.stringify(v, null, 2)
