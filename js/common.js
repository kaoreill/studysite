// common.js — theme toggle shared by every page.
// (Manifest loading and nav breadcrumb wiring land here too once the
// implementation plan builds the data-driven pages.)

const STORAGE_KEY = "studysite:v1";

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private browsing, etc.) — theme just won't persist.
  }
}

let cachedManifest = null;
let inFlightManifest = null;

// Fetches data/modules.json once per page load and caches it; a second
// call while the first is still in flight reuses that same promise
// instead of firing a duplicate request.
export async function fetchModules() {
  if (cachedManifest) return cachedManifest;
  if (!inFlightManifest) {
    inFlightManifest = fetch("data/modules.json").then((res) => {
      if (!res.ok) throw new Error(`modules.json fetch failed: ${res.status}`);
      return res.json();
    });
  }
  cachedManifest = await inFlightManifest;
  return cachedManifest;
}

export function findModule(manifest, slug) {
  return manifest.modules.find((m) => m.slug === slug);
}

export function findWeek(moduleObj, weekNumber) {
  return moduleObj.weeks.find((w) => w.week === weekNumber);
}

export function isWeekEmpty(weekObj) {
  return weekObj.title === "" && weekObj.pdfs.length === 0 && weekObj.cards === null;
}

export function countWeeksWithContent(moduleObj) {
  return moduleObj.weeks.filter((w) => !isWeekEmpty(w)).length;
}

export function getQueryParam(name, search = window.location.search) {
  return new URLSearchParams(search).get(name);
}

export function onKey(key, handler) {
  document.addEventListener("keydown", (event) => {
    if (event.key === key) handler(event);
  });
}

export function onSwipe(element, { onLeft, onRight }) {
  let startX = null;
  element.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].clientX;
  });
  element.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    startX = null;
    if (deltaX <= -40) onLeft?.();
    else if (deltaX >= 40) onRight?.();
  });
}

export function isFileProtocol(protocol = window.location.protocol) {
  return protocol === "file:";
}

export function renderFatalError(container, message) {
  container.innerHTML = "";
  const div = document.createElement("div");
  div.className = "fatal-error";
  div.textContent = message;
  container.appendChild(div);
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
