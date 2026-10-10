import { useEffect, type RefObject } from 'react'
import type { TFunction } from 'i18next'
import { initHomeMotion } from '../utils/home-motion'

/** Bind homepage animation resources to the React lifecycle and current language. */
export function useHomeMotion(
  root: RefObject<HTMLDivElement | null>,
  t: TFunction<'home'>
) {
  useEffect(() => {
    if (!root.current) return
    return initHomeMotion(root.current, t)
  }, [root, t])
}
