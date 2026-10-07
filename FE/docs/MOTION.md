# Shared Hub motion

Import from `@/components/ui/motion`. This module is independent of pages, features and themes; it uses React and the browser's Web Animations API. No animation package is required.

## One place to tune

[tokens.ts](../src/components/ui/motion/tokens.ts) owns duration, easing, distance and maximum stagger delay. `main.tsx` installs the same tokens as CSS variables for interactions. Entry uses gentle deceleration rather than elastic/bouncing motion: 680ms reveals, 800ms panels, 580ms pages, 1200ms chart drawing, 360ms exits and 220ms control feedback. Overrides use milliseconds.

## Components

```tsx
import { MotionPage, MotionReveal, MotionStagger, MotionPresence, MotionPath } from '@/components/ui/motion'

<MotionPage replayKey={pathname}>{children}</MotionPage>

<MotionStagger className="grid gap-6 md:grid-cols-2">
  <MotionReveal preset="panel" viewport>First panel</MotionReveal>
  <MotionReveal preset="panel" viewport>Second panel</MotionReveal>
</MotionStagger>

<MotionPresence show={expanded} preset="popover" className="popover">
  {popoverContent}
</MotionPresence>

<svg viewBox="0 0 800 250">
  <MotionPath d={seriesPath} fill="none" stroke="currentColor" />
</svg>
```

`MotionStagger` supplies a delay to each child's animation through context, adding no item wrappers. Children must use `MotionReveal` or `useMotion`; ordinary HTML children are intentionally untouched. Stagger delay is capped at 360ms. Give list children stable React keys. Avoid combining a reveal wrapper with another reveal on the same panel.

## Existing semantic elements

```tsx
import { useMotion } from '@/components/ui/motion'

const panel = useMotion<HTMLElement>({ preset: 'panel', viewport: true })
return <section ref={panel}>{children}</section>

const rows = useMotion<HTMLTableSectionElement>({
  preset: 'fade',
  replayKey: visibleCaseIds.join(','),
})
return <tbody ref={rows}>{rowsContent}</tbody>
```

`replayKey` explicitly identifies a meaningful state change. Normal React renders do not restart motion. `disabled` skips an entrance until asynchronous data is ready. `viewport` runs once when content reaches the viewport, not every time the user scrolls back. Keep transforms on an animation wrapper rather than an element with a permanent layout transform.

Add `motion-interactive` to buttons/links for shared color, border, shadow and press feedback. Add `motion-directional` to an action containing a directional SVG icon. Shared Button and CustomSelect already use the interaction class.

## Lifecycle and accessibility

Base markup remains visible without JavaScript animation support. Native effects are cancelled on completion and unmount, leaving no filled transforms behind. Presence cancels interrupted exits, resumes from the current visual position, and makes exiting content inert immediately. The caller owns focus return (for example, focus the popup's trigger before closing). Keep content mounted inside MotionPresence while `show` changes; do not conditionally render the whole presence component.

Reduced motion is observed live: spatial movement/drawing and stagger delays are removed, retaining a 100ms opacity confirmation. No loop or layout-dimension animation is included.

## Current adoption and verification

All registered pages inherit MotionPage through the root router's RouteMotion boundary: login, registration, dashboard, Admin, Knowledge, Drafts, Expert and the 404 page. Lazy pages commit inside Suspense before their entrance runs. The boundary animates the page's main content (or a marked data-motion-content region), preserves fixed shell navigation, and uses pathname rather than search parameters. It has no React key, so filter changes do not remount forms. New routes nested under the root inherit this automatically.

ExpertPanel and Draft Paper use useMotion; overview panel grids use MotionStagger; review trend lines use MotionPath; notifications use MotionPresence. Admin, Knowledge and Expert queue tables fade updated rows; login view changes and registration wizard steps use shared presets. Account menus, native notification popovers, calendars and selects use the popover preset. The dropdown keeps list-only scrolling and viewport-aware placement.

All four workspace navigation drawers and the common Modal/Drawer use useDialogMotion. It observes native dialog opening, keeping showModal/close, focus trapping and focus return intact. Dialog exits remain immediate so closing semantics never wait for an animation. Toasts use the shared reveal preset. Scoped button/form feedback applies throughout data-motion-page; use motion-interactive outside routed content.

Run `npm run build` and `npm run lint` from FE after changing motion source. These check compilation and code boundaries, not visual quality. The current package has no `test:motion` script or retained motion unit-test suite.

Manually check reload, route navigation, filter changes without form remounts, viewport reveals, rapid open/close, native dialog focus return, dropdown scrolling near viewport edges, reduced-motion changes and unsupported-animation fallback. Inspect desktop/mobile timing and performance in a browser; static checks do not verify these behaviors.

Use MotionPage once at the router boundary. New child routes inherit it automatically; use MotionReveal for selected sections without reanimating the whole page twice. MotionPage targets `[data-motion-content]` or `main`; verify that new page markup exposes the intended content region.

Legacy CSS keyframes coexist with this module, but their entrance/feedback timings now consume shared motion variables. Delays use the installed stagger interval and are capped at four intervals. Continuous spinners retain their loop cadence. Reusable motion takes its values from tokens.ts; component layout/sequence can remain local. Colors, fonts and other UI tokens are documented in [THEMING.md](THEMING.md) and [UI-CONFIG.md](UI-CONFIG.md).
