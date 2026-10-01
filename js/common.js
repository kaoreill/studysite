// common.js — theme toggle shared by every page.
// (Manifest loading and nav breadcrumb wiring land here too once the
// implementation plan builds the data-driven pages.)

const STORAGE_KEY = "studysite:v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private browsing, etc.) — theme just won't persist.
  }
}

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function initThemeToggle() {
  // The inline snippet in <head> already applied any stored theme before
  // first paint; this just wires the button to flip and persist it.
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const effective = current || system;
    const next = effective === "dark" ? "light" : "dark";

    applyTheme(next);
    const state = loadState();
    state.theme = next;
    saveState(state);
  });
}

document.addEventListener("DOMContentLoaded", initThemeToggle);
