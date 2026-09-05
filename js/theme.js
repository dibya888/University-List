// ============================================================
// Theme toggle (dark / light)
// ------------------------------------------------------------
// The actual "apply theme before first paint" logic lives in a
// tiny inline script in <head> (to avoid a flash of the wrong
// theme). This file only wires up the toggle button and keeps
// localStorage in sync after that.
// ============================================================

(function () {
  "use strict";

  const STORAGE_KEY = "theme-preference";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage unavailable — theme still applies for this session */
    }
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  function wireToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    applyTheme(currentTheme()); // sync aria state with whatever the inline head script already set
    btn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  document.addEventListener("DOMContentLoaded", wireToggle);
})();
