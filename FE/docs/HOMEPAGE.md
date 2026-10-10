# Homepage redesign

The redesign replaces the previous homepage at `/` and is the project's main homepage.

## Source and conventions

- `src/pages/home/HomePage.tsx` composes `features/home/components/HomeLanding`.
- `src/features/home/components/` owns navigation, hero, footer, back-to-top and six content sections.
- `src/features/home/hooks/useHomeMotion.ts` binds animation to the React lifecycle.
- `src/features/home/utils/home-motion.ts` owns scroll scrubbing, caption bands,
  reveals, navigation, progress and the illustrative hold-to-verify interaction.
- `src/features/home/styles/home.css` scopes selectors to `#shub-home` and namespaces
  keyframes. Fixed media colors use `--ui-home-*` in `src/styles/theme.css`.
- `src/features/home/assets/` contains bundled imagery and the 3.7 MB hero video.
- `src/lib/i18n/locales/{vi,en}/home.json` owns the `home` namespace, using explicit
  React emphasis components without raw HTML insertion.

The shared language switcher persists the user's preference. Inputs and a completed
illustrative stamp survive language changes. The homepage opts out of `MotionPage`
to preserve fixed navigation and the sticky hero.

## Behavior

Desktop scroll uses frame-rate-independent interpolation and serialized video seeks.
Mobile, portrait touch, short landscape touch and reduced motion use a static hero.
Video failures fall back to stills. Loading has a timeout. Unmount cancels fetches,
frames, timers, listeners and observers, unloads the video and revokes its object URL.
Hidden caption bands are inert and excluded from accessibility navigation.

Hero questions prefill `/ai-assistant` via router state, limited to 2,000 characters,
without being placed in the URL or automatically sent. Existing assistant demo/auth
behavior remains in place. Product links target existing routes. Verification is an
illustrative sample, not a real review or payment. FAQs use native details/summary.

## Validation

Build and lint pass. Server render checks pass in Vietnamese and English for headings,
two forms, four FAQs and navigation. All 124 translation keys, interpolation variables
and emphasis tags match; English renders without untranslated Vietnamese prose.
No connected browser was available. Desktop/mobile visual comparison, video scrubbing,
hold interaction and live reduced-motion changes still need browser verification.
