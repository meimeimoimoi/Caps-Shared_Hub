import { CROSSCHECK, type CrosscheckKey } from '../constants'

/* Crosscheck ticks of a review in progress, kept for the browser tab so a reload does not wipe them.
 * Storage can be missing or blocked (private mode), so every access is guarded. */
const key = (documentId: string) => `knowledge-crosscheck:${documentId}`

export function loadCrosscheck(documentId: string): CrosscheckKey[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key(documentId)) ?? '[]')
    return Array.isArray(raw)
      ? raw.filter((k): k is CrosscheckKey => k in CROSSCHECK)
      : []
  } catch {
    return []
  }
}

export function saveCrosscheck(documentId: string, checked: CrosscheckKey[]) {
  try {
    if (checked.length)
      sessionStorage.setItem(key(documentId), JSON.stringify(checked))
    else sessionStorage.removeItem(key(documentId))
  } catch {
    // Storage unavailable: ticks live only in memory
  }
}
