# Shared UI tokens and themes

`src/styles/theme.css` owns semantic color values for light and dark themes.
`globals.css` owns typography, spacing, radii and shadows; existing SHFT color
utilities (`bg-paper`, `text-fg`, etc.) remain aliases of the shared palette.
Expert `--ep-*` colors also alias the palette to support gradual migration.

## Building a page

Use role-based utilities rather than literal colors:

- Page: `bg-canvas text-text`.
- Card, dialog or input: `bg-surface text-text border-border`.
- Secondary section: `bg-surface-muted`.
- Heading: `text-text-strong`; supporting text: `text-text-muted`.
- Primary action: `bg-accent text-on-accent hover:bg-accent-hover`.
- Selection: `bg-accent-soft text-accent-text`.
- Solid selected control: `bg-selected text-on-selected`; keep the pair together.
- Use `accent-text` for text links and `accent-hover` for primary button hover.
- Chart segments use `--ui-chart-*`; SVG labels use the normal text tokens.
- Demo disclosures use the shared `DemoBanner`, separate from warning alerts.
- Status: `text-success bg-success-soft` (or warning/danger).

A new theme color should describe its role and have values for both themes.
Do not add conditional light/dark colors inside shared components. Fixed brand
artwork, the dark navigation sidebar and document-specific print styles can
have intentional fixed colors.

## Theme behavior

`ThemeProvider` lives at the app root; `useTheme()` exposes `isDark`,
`toggleTheme()` and `setPreference('light' | 'dark' | 'system')`.
The selected theme is applied to `html[data-theme]` before React mounts and
saved under `shared-hub-theme`. The previous `expert-theme` preference is read
as a migration fallback. System preference is followed until an explicit
selection is made; system changes and other-tab selections are synchronized.
Blocked local storage does not prevent changing themes in memory.

Expert and Draft now share this preference and palette. Legacy pages with
literal colors, registration-specific `ex-*` tokens and bespoke illustrations
still need individual migration and visual review. This foundation does not
mean every existing page has already been visually validated in dark mode.
