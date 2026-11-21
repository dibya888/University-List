// ============================================================
// Data aggregator
// ------------------------------------------------------------
// Combines every per-country dataset into one PROGRAMS array that
// the rest of the app reads from. Adding a new country later is a
// 3-step, additive change — nothing above this needs to be touched:
//
//   1. Create js/data/<country>.js defining `const COUNTRY_<NAME> = [...]`
//      (copy the shape used in js/data/germany.js — every record needs
//      a "country" field; keep all other fields consistent where you
//      can, but exact field lists may vary between programs.)
//   2. Add a <script src="js/data/<country>.js"></script> tag in
//      index.html, right next to the existing data script tags.
//   3. Add the new array to the COUNTRY_DATASETS list below.
//
// `id` is reassigned sequentially here across the merged set, so
// per-country files don't need to worry about clashing IDs.
// ============================================================

const COUNTRY_DATASETS = [
  typeof COUNTRY_GERMANY !== "undefined" ? COUNTRY_GERMANY : [],
  typeof COUNTRY_SWITZERLAND !== "undefined" ? COUNTRY_SWITZERLAND : [],
  typeof COUNTRY_AUSTRIA !== "undefined" ? COUNTRY_AUSTRIA : [],
  // Add new countries here, e.g.:
  // typeof COUNTRY_USA !== "undefined" ? COUNTRY_USA : [],
];

const PROGRAMS = COUNTRY_DATASETS.flat().map((program, index) => ({
  ...program,
  id: index + 1,
}));
