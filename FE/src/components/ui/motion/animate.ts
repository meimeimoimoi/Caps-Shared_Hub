/** A cancellable native animation. No persistent transforms or hidden CSS state. */
export function animateElement(
  element: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
  onFinish?: () => void
) {
  if (typeof element.animate !== 'function') {
    onFinish?.()
    return () => {}
  }
  const animation = element.animate(frames, { fill: 'both', ...options })
  let disposed = false
  animation.onfinish = () => {
    if (disposed) return
    // Release the effect so sticky/fixed descendants and future transforms work normally.
    animation.cancel()
    onFinish?.()
  }
  return () => {
    disposed = true
    animation.onfinish = null
    animation.cancel()
  }
}
