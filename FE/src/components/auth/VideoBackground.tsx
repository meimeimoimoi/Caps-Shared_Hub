import { useEffect, useRef } from 'react'
import { cn } from '@/shared/lib/utils'

export const LOGIN_INTRO_VIDEO_URL =
  'https://res.cloudinary.com/ddxqug5ad/video/upload/v1790954828/loginIntro.mp4'

export type VideoBackgroundProps = {
  className?: string
}

const AUTOPLAY_EVENTS = ['click', 'touchstart', 'keydown'] as const

export function VideoBackground({ className }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleInteraction = () => {
      video.play().catch(() => {})
      AUTOPLAY_EVENTS.forEach((event) => document.removeEventListener(event, handleInteraction))
    }

    video.muted = true
    video.play().catch(() => {
      AUTOPLAY_EVENTS.forEach((event) =>
        document.addEventListener(event, handleInteraction, { once: true }),
      )
    })

    return () => {
      AUTOPLAY_EVENTS.forEach((event) => document.removeEventListener(event, handleInteraction))
    }
  }, [])

  return (
    <video
      ref={videoRef}
      className={cn('fixed inset-0 h-full w-full object-cover pointer-events-none -z-0', className)}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      preload="auto"
      src={LOGIN_INTRO_VIDEO_URL}
    />
  )
}

export default VideoBackground
