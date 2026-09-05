# University List — Dossier

A verified, filterable database of Master's programs. Static site, no build step.

## Structure

```
index.html
css/
  style.css          All styling. Colors are CSS variables (design tokens) defined
                      once in :root, with a second set of values under
                      [data-theme="dark"] — that's the entire dark mode implementation.
js/
  config.js          Small display config: per-country flag/label, default theme.
  theme.js           Wires up the dark/light toggle button.
  data/
    germany.js       Germany's 34 programs (COUNTRY_GERMANY array). Unchanged content
                      from the original dataset — only a "country" field was added.
    index.js         Merges every COUNTRY_* array into the single PROGRAMS array
                      the app reads from, and assigns sequential ids.
  app.js             Rendering, filtering, sorting, the detail modal.
vendor/bootstrap/     Grid + modal component only — visuals come from style.css.
fonts/
```

## Adding a new country's data

This is additive — you shouldn't need to touch `app.js`, `style.css`, or the
existing `germany.js` at all.

1. **Create `js/data/<country>.js`** defining `const COUNTRY_<NAME> = [ ... ]`,
   an array of program objects. Copy the field shape from `js/data/germany.js`.
   Every record needs at least a `"country"` field with the country's display
   name (e.g. `"country": "Netherlands"`) — that's what powers the country
   filter and the stat strip.
2. **Add a `<script>` tag** for that file in `index.html`, next to the existing
   `<script src="js/data/germany.js"></script>` line (before `js/data/index.js`).
3. **Register it in `js/data/index.js`** by adding the new array to the
   `COUNTRY_DATASETS` list at the top of that file.
4. *(Optional)* Add a flag/label entry for the country in `js/config.js`
   under `SITE_CONFIG.countryMeta` — if you skip this, the filter still works,
   it just shows the plain country name with no flag emoji.

That's it — the country filter, the state/region filter (which scopes itself
to the selected country), the stat strip counts, and the detail modal all pick
up new countries automatically.

## Things worth knowing

- The **hero headline, intro paragraph, and footer/methodology text** in
  `index.html` are written specifically about the Germany research (e.g. "34
  programs across Germany", "Compiled July 2026"). Those weren't
  auto-generalized — update that copy by hand whenever it stops matching
  reality (e.g. once a second country is added).
- `id` values are reassigned sequentially across the merged dataset in
  `js/data/index.js`, so individual country files don't need to worry about
  id collisions with each other.
- Dark/light mode is remembered per-browser via `localStorage` and otherwise
  follows the OS preference (`prefers-color-scheme`) on first visit.
