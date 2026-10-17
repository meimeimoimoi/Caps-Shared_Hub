import { useLayoutEffect, type RefObject } from 'react'
import { animateElement } from './animate'
import { motionFrames, motionTokens, type MotionPreset } from './tokens'
import { useReducedMotion } from './use-motion'

/** Native showModal/close and focus trapping remain owned by the browser. */
export function useDialogMotion(
  ref: RefObject<HTMLDialogElement | null>,
  preset: MotionPreset = 'dialog'
) {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    let stop: (() => void) | undefined
    const sync = () => {
      stop?.()
      stop = dialog.open
        ? animateElement(dialog, motionFrames(preset, reduced), {
            duration: reduced
              ? motionTokens.duration.reduced
              : motionTokens.duration.panel,
            easing: motionTokens.easing.enter,
          })
        : undefined
    }
    const observer = new MutationObserver(sync)
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] })
    if (dialog.open) sync()
    return () => {
      observer.disconnect()
      stop?.()
    }
  }, [ref, preset, reduced])
}
