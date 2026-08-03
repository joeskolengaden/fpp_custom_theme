# WinterLights.in theme pack

A drop-in theme for this plugin: 7 switchable skins (Midnight, Festive,
Minimal, Frost, Noir, Gingerbread, and Default — FPP's own native look,
unmodified) with a floating picker widget, all driven by CSS custom
properties.

## Files

- `custom.css` — shared skeleton, auto-loaded by FPP (`config/custom.css`).
  Contains no colors of its own; every property reads a `--wl-*` variable
  supplied by whichever skin file is active. Disables itself entirely when
  the "Default" skin is selected, so native FPP renders untouched.
- `custom.js` — skin engine: injects the active skin stylesheet, the brand
  block, and the floating picker; auto-discovers any `wl-skin-*.css` file
  uploaded later without needing further edits.
- `wl-picker.css` — always-on styling for the brand block + picker widget,
  loaded regardless of which skin (including Default) is active.
- `wl-skin-midnight.css`, `wl-skin-festive.css`, `wl-skin-minimal.css`,
  `wl-skin-frost.css`, `wl-skin-noir.css`, `wl-skin-gingerbread.css`,
  `wl-skin-default.css` — the individual skins. Noir and Gingerbread are
  only in `custom.js`'s auto-discovery, not its hardcoded fallback list —
  they'll appear in the picker once `custom.js` has fetched the config
  file listing, a live test of that discovery path.

## Install

Upload all files above through this plugin's own **Content Setup → Custom
Theme** page ("Upload Your custom.css or custom.js files"), one at a time.
FPP auto-loads `custom.css`/`custom.js`; the rest load themselves.

## Adding a new skin

**Start from `THEME-TEMPLATE.css`** — copy it to `wl-skin-<id>.css` and fill
in the `--wl-*` values. It documents every variable and bakes in the
gotchas this pack's own skins hit during development (e.g. keeping
`--wl-menu-bg` in the same light/dark family as `--wl-bg`, the header
wordmark's gradient being independent of `--wl-header-text`, never setting
`position:relative` on `.header`). Follow the `/* WinterLights skin ::
NAME — description */` header comment format — `custom.js` discovers any
`wl-skin-<id>.css` via FPP's `GET /api/configfile` listing endpoint and
adds it to the picker automatically on the next page load, no changes to
`custom.js` needed. (`THEME-TEMPLATE.css` is intentionally NOT named
`wl-skin-*.css`, so it never gets auto-discovered as a real, selectable
skin itself.)

Before shipping a new skin, check every text/background pairing against
WCAG AA (4.5:1 body text, 3:1 large/UI text) with real computed contrast
values — several first drafts in this pack measured well under 4.5:1 on
the first try.

Targets FPP 5.4 → 9.x.
