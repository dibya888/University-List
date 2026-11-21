// ============================================================
// Site configuration
// ------------------------------------------------------------
// Small, structural settings the app reads from. Nothing here is
// program data — it's display metadata (flags, labels) and the
// theme default. Safe to extend when new countries are added.
// ============================================================

const SITE_CONFIG = {
  // Shown as the default theme before a visitor has picked one,
  // and before we check prefers-color-scheme. "auto" follows the
  // OS/browser setting; use "light" or "dark" to force a default.
  defaultTheme: "auto",

  // Optional per-country display metadata, keyed by the exact
  // `country` string used in the data files. Falls back gracefully
  // if a country has no entry here.
  countryMeta: {
    Germany: { flag: "🇩🇪", label: "Germany" },
    Switzerland: { flag: "🇨🇭", label: "Switzerland" },
    Austria: { flag: "🇦🇹", label: "Austria" },
  },
};

function getCountryMeta(country) {
  return (SITE_CONFIG.countryMeta && SITE_CONFIG.countryMeta[country]) || { flag: "", label: country };
}
