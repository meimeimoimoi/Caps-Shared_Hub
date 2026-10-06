import { useMotion } from '@/components/ui/motion'

export function useWizardMotion(step: number, visible: boolean) {
  return useMotion({ preset: 'panel', replayKey: step, disabled: !visible })
}
