# UI Tokens and Rules

The design tokens and layout rules behind NoteMark's look. Use these instead of raw colours or
sizes so light and dark themes keep working. Tokens are defined in
`src/renderer/src/assets/main.css` and exposed to Tailwind in `tailwind.config.js`; update both and this file together.

## Colour tokens (RGB triplets, used as `rgb(var(--x) / alpha)`)

| Token | Tailwind | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--bg` | `canvas` | `255 255 255` | `27 28 32` | Editor background, dialogs |
| `--bg-sidebar` | `sidebar` | `246 246 243` | `34 35 39` | Sidebar and its title bar section |
| `--surface` | `surface` | `234 234 230` | `46 47 54` | Selected note |
| `--fg` | `fg` | `29 29 31` | `232 232 235` | Text; borders/hover use `fg/[0.05–0.15]` |
| `--muted` | `muted` | `110 110 118` | `152 152 162` | Secondary text, icons |
| `--accent` | `accent` | `196 132 18` | `242 184 75` | Amber: caret, active marker, focus rings, links |

The native window-control colour in `src/main/index.ts` (`chromeColors`) must match `--bg`.

## Type and spacing
- UI font: system sans (`font-sans`), 13–14 px; editor body 16 px / 1.75 line height, max width 780 px.
- Code: `font-mono` (system monospace stack). No web fonts (CSP blocks remote fonts).
- Title bar height `--titlebar-height: 40px`; sidebar width `--sidebar-width: 264px`; Windows/Linux reserve 140 px on the right for window controls, macOS 78 px on the left for traffic lights.

## Rules
- Draggable areas use `.drag-region`; anything clickable inside them needs `.no-drag` (`.icon-button` includes it).
- Icons: `react-icons/lu` (Lucide) at 13–16 px.
- Focus is always visible (`ring-accent/60`); every icon-only button has an `aria-label`.
- Animations stay under 200 ms (`animate-fade-in`, `animate-pop-in`).
