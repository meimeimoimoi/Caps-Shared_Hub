import type { TFunction } from 'i18next'
import posterUrl from '../assets/hero-poster.jpg'
import endingUrl from '../assets/hero-ending.jpg'
import videoUrl from '../assets/hero-scrub.mp4'

const gates = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)',
]
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number, from: number, to: number) => {
  const p = clamp((value - from) / (to - from))
  return p * p * (3 - 2 * p)
}

/** All animation resources belong to this mount, including StrictMode's first mount. */
export function initHomeMotion(root: HTMLElement, t: TFunction<'home'>) {
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    root.querySelector<T>(`#${id}`)!
  const hero = get('hero'),
    stage = get('stage'),
    video = get<HTMLVideoElement>('heroVideo')
  const sheet = get('sheetLayer'),
    ring = stage.querySelector<SVGElement>('.ring')!,
    nav = root.querySelector<HTMLElement>('.nav')!
  const track = get('track'),
    trackDone = get<HTMLElement>('trackDone'),
    finalVisual = get('finalVisual')
  const steps = [...track.querySelectorAll<HTMLElement>('.step')]
  const bands = [...stage.querySelectorAll<HTMLElement>('.band')]
  const queries = gates.map((query) => matchMedia(query)),
    reduced = queries[4]
  const disposals: (() => void)[] = []
  const frames = new Set<number>(),
    timers = new Set<ReturnType<typeof setTimeout>>()
  let disposed = false,
    objectUrl: string | undefined,
    loading = false,
    ready = false,
    failed = false
  let ctrl: AbortController | undefined
  const frame = (callback: FrameRequestCallback) => {
    const id = requestAnimationFrame((now) => {
      frames.delete(id)
      if (!disposed) callback(now)
    })
    frames.add(id)
    return id
  }
  const later = (callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (!disposed) callback()
    }, delay)
    timers.add(id)
    return id
  }
  function listen(
    target: EventTarget,
    type: string,
    callback: EventListener,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(type, callback, options)
    disposals.push(() => target.removeEventListener(type, callback, options))
  }
  function observe(
    elements: Element[],
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    const observer = new IntersectionObserver(callback, options)
    elements.forEach((el) => observer.observe(el))
    disposals.push(() => observer.disconnect())
    return observer
  }
  const set = (el: HTMLElement | SVGElement, name: string, value: number) =>
    el.style.setProperty(name, String(value))
  get('poster').style.backgroundImage = `url("${posterUrl}")`
  get('posterEnd').style.backgroundImage = `url("${endingUrl}")`
  get('finalBg').style.backgroundImage = `url("${endingUrl}")`
  let enabled = false,
    onScreen = true,
    target = 0,
    shown = 0,
    last = 0,
    animation: number | undefined,
    loadStart = performance.now()
  let seekBusy = false,
    pending: number | undefined
  const progress = () =>
    clamp(
      -hero.getBoundingClientRect().top /
        Math.max(1, hero.offsetHeight - innerHeight)
    )
  function seek(time: number) {
    if (!ready || !Number.isFinite(video.duration)) return
    const next = Math.max(0, Math.min(video.duration - 0.04, time))
    if (seekBusy) {
      pending = next
      return
    }
    if (Math.abs(video.currentTime - next) < 0.001) return
    seekBusy = true
    video.currentTime = next
  }
  listen(video, 'seeked', () => {
    seekBusy = false
    if (pending !== undefined) {
      const next = pending
      pending = undefined
      seek(next)
    }
  })
  function captions(p: number, intro: number) {
    bands.forEach((band, i) => {
      const a = Number(band.dataset.a),
        b = Number(band.dataset.b),
        fade = Math.min(0.02, (b - a) / 3)
      const opacity =
        (i === 0 ? 1 : smooth(p, a, a + fade)) *
        (i === bands.length - 1 ? 1 : 1 - smooth(p, b - fade, b))
      const visible = opacity > 0.01
      band.style.opacity = opacity.toFixed(3)
      band.style.visibility = visible ? 'visible' : 'hidden'
      // Invisible captions must not remain reachable by keyboard or screen readers.
      band.inert = !visible
      band.setAttribute('aria-hidden', String(!visible))
      const k = clamp((p - a) / (Number(band.dataset.ramp) || 0.025))
      set(band, '--k', i === 0 ? Math.max(k, intro) : k)
    })
    set(sheet, '--l', smooth(p, 0.88, 0.93))
    set(sheet, '--s', smooth(p, 0.93, 0.975))
    stage.querySelector<HTMLElement>('.cue')!.style.opacity =
      p < 0.04 ? '' : '0'
    stage.classList.toggle('at-end', failed && p > 0.5)
  }
  function tick(now: number) {
    animation = undefined
    if (!enabled || !onScreen || document.hidden) {
      last = 0
      return
    }
    const dt = Math.min(100, now - (last || now))
    last = now
    const intro = 1 - Math.pow(1 - clamp((now - loadStart) / 1100), 3)
    shown += (target - shown) * (1 - Math.pow(0.84, dt / 16.667))
    if (Math.abs(target - shown) < 0.0005) shown = target
    seek(shown * (video.duration || 0))
    captions(shown, intro)
    if (shown !== target || intro < 1) animation = frame(tick)
    else last = 0
  }
  function kick() {
    if (animation === undefined && enabled && onScreen && !document.hidden)
      animation = frame(tick)
  }
  function failVideo() {
    if (disposed) return
    failed = true
    ring.style.opacity = '0'
    stage.classList.add('video-failed')
    kick()
  }
  listen(video, 'error', failVideo)
  async function loadVideo() {
    if (loading) return
    loading = true
    ctrl = new AbortController()
    let timeout = later(() => ctrl?.abort(), 20000)
    try {
      const response = await fetch(videoUrl, { signal: ctrl.signal })
      if (!response.ok || !response.body) throw new Error('Video unavailable')
      const reader = response.body.getReader(),
        chunks: BlobPart[] = []
      const total = Number(response.headers.get('content-length')) || 3710379
      let bytes = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        clearTimeout(timeout)
        timers.delete(timeout)
        timeout = later(() => ctrl?.abort(), 20000)
        if (disposed) {
          await reader.cancel()
          return
        }
        chunks.push(value.slice().buffer)
        bytes += value.length
        set(ring, '--ld', 126 * (1 - clamp(bytes / total)))
      }
      if (disposed) return
      objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }))
      video.src = objectUrl
      video.load()
    } catch {
      if (!disposed) failVideo()
    } finally {
      clearTimeout(timeout)
      timers.delete(timeout)
    }
  }
  listen(video, 'loadeddata', () => {
    ready = true
    stage.classList.add('video-ready')
    target = progress()
    seek(target * video.duration)
    kick()
  })
  observe([hero], (entries) => {
    onScreen = entries[0].isIntersecting
    stage.classList.toggle('live', onScreen && enabled)
    kick()
  })
  function mode() {
    enabled = !queries.some((query) => query.matches)
    stage.classList.toggle('live', enabled && onScreen)
    root.classList.toggle('static-mode', !enabled)
    hero.inert = !enabled
    hero.setAttribute('aria-hidden', String(!enabled))
    get('heroStatic').inert = enabled
    get('heroStatic').setAttribute('aria-hidden', String(enabled))
    if (enabled) {
      void loadVideo()
      target = progress()
      loadStart = performance.now()
      kick()
    } else if (animation !== undefined) {
      cancelAnimationFrame(animation)
      frames.delete(animation)
      animation = undefined
      last = 0
    }
    if (reduced.matches) {
      root
        .querySelectorAll('.reveal')
        .forEach((el) => el.classList.add('in', 'settled'))
      set(trackDone, 'stroke-dashoffset', 0)
      steps.forEach((el) => el.classList.add('lit'))
      complete()
    }
    update()
  }
  const toTop = get<HTMLButtonElement>('toTop')
  let queued = false
  function update() {
    queued = false
    target = progress()
    kick()
    nav.classList.toggle(
      'solid',
      scrollY >
        (enabled ? hero.offsetHeight - innerHeight * 0.5 : innerHeight * 0.6)
    )
    toTop.classList.toggle('show', scrollY > innerHeight * 1.2)
    toTop.inert = scrollY <= innerHeight * 1.2
    set(
      toTop,
      '--tp',
      1 -
        clamp(
          scrollY /
            Math.max(1, document.documentElement.scrollHeight - innerHeight)
        )
    )
    if (!reduced.matches) {
      const p = clamp(
          (innerHeight * 0.78 - track.getBoundingClientRect().top) /
            (innerHeight * 0.5)
        ),
        reached = Math.floor(p * (steps.length - 1) + 0.001)
      trackDone.style.strokeDashoffset = String(
        1 - reached / (steps.length - 1)
      )
      steps.forEach((el, i) => el.classList.toggle('lit', i <= reached))
    }
    set(
      sheet,
      '--cv',
      Math.max(stage.clientWidth / 1920, stage.clientHeight / 1080)
    )
    set(finalVisual, '--fv', finalVisual.clientWidth / 1140)
  }
  const schedule = () => {
    if (!queued) {
      queued = true
      frame(update)
    }
  }
  listen(window, 'scroll', schedule, { passive: true })
  listen(window, 'resize', schedule, { passive: true })
  listen(toTop, 'click', () => {
    window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' })
    nav.querySelector<HTMLElement>('.brand')?.focus({ preventScroll: true })
  })
  const reveal = observe(
    [...root.querySelectorAll('.reveal')],
    (entries, observer) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
          later(() => entry.target.classList.add('settled'), 1700)
        }
    },
    { threshold: 0.18 }
  )
  void reveal
  observe([...root.querySelectorAll('.escrow,.final')], (entries) =>
    entries.forEach((entry) =>
      entry.target.classList.toggle('live', entry.isIntersecting)
    )
  )
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('.nav-links a')]
  observe(
    links
      .map((link) => root.querySelector(link.getAttribute('href')!)!)
      .filter(Boolean),
    (entries) => {
      const active = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (active)
        links.forEach((link) => {
          if (link.hash === '#' + active.target.id)
            link.setAttribute('aria-current', 'true')
          else link.removeAttribute('aria-current')
        })
    },
    { rootMargin: '-45% 0px -50% 0px' }
  )
  const hold = get<HTMLButtonElement>('holdBtn'),
    doc = get('doc')
  let holding = false,
    verified = false,
    hp = 0,
    holdFrame: number | undefined,
    holdLast = 0
  function complete() {
    verified = true
    holding = false
    hp = 1
    set(hold, '--hp', 1)
    doc.classList.add('verified')
    hold.classList.add('done')
    hold.setAttribute('aria-pressed', 'true')
    get('holdLabel').textContent = t('verify.held')
    get('docVer').textContent = t('verify.verifiedVersion')
    get('holdHint').textContent = t('verify.heldHint')
  }
  function holdTick(now: number) {
    holdFrame = undefined
    const dt = Math.min(250, now - (holdLast || now))
    holdLast = now
    hp = clamp(hp + dt / (holding ? 1400 : -840))
    set(hold, '--hp', hp)
    if (hp >= 1) {
      complete()
      return
    }
    if (!holding && hp <= 0) {
      holdLast = 0
      return
    }
    holdFrame = frame(holdTick)
  }
  function start(event: Event) {
    if (
      verified ||
      (event instanceof KeyboardEvent &&
        (![' ', 'Enter'].includes(event.key) || event.repeat))
    )
      return
    if (event instanceof PointerEvent && event.button !== 0) return
    event.preventDefault()
    holding = true
    if (event instanceof PointerEvent) hold.setPointerCapture(event.pointerId)
    if (holdFrame === undefined) {
      holdLast = 0
      holdFrame = frame(holdTick)
    }
  }
  function end(event?: Event) {
    if (event instanceof KeyboardEvent && ![' ', 'Enter'].includes(event.key))
      return
    holding = false
  }
  listen(hold, 'pointerdown', start)
  listen(hold, 'keydown', start)
  for (const type of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
    'keyup',
    'blur',
  ])
    listen(hold, type, end)
  listen(hold, 'contextmenu', (event) => event.preventDefault())
  listen(window, 'blur', () => end())
  listen(document, 'visibilitychange', () => {
    root.classList.toggle('paused', document.hidden)
    if (document.hidden) end()
    else kick()
  })
  queries.forEach((query) => listen(query, 'change', mode))
  if (doc.classList.contains('verified')) complete()
  mode()
  return () => {
    disposed = true
    ctrl?.abort()
    frames.forEach((id) => cancelAnimationFrame(id))
    timers.forEach((id) => clearTimeout(id))
    disposals.forEach((dispose) => dispose())
    video.pause()
    video.removeAttribute('src')
    video.load()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
