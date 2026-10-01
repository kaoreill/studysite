// flashcards.js — flip-card study mode for a scoped set of weeks.
import { fetchModules, findModule, getQueryParam, renderFatalError, onKey, onSwipe, loadState, saveState } from "./common.js";
import { parseScope, weeksForScope, loadCardsForWeeks, shuffleArray } from "./study-scope.js";

function renderNoCards(moduleSlug, missingWeeks = []) {
  const extra = missingWeeks.length
    ? ` (no card decks for week${missingWeeks.length > 1 ? "s" : ""} ${missingWeeks.join(", ")})`
    : "";
  document.getElementById("flashcards-content").innerHTML = `
    <p class="fatal-error">
      No cards found for this selection${extra}.
      <a href="module.html?m=${moduleSlug || ""}">Back to module</a>.
    </p>
  `;
}

function scopeLabel(scope) {
  if (scope.type === "week") return `Week ${scope.week}`;
  if (scope.type === "range") return `Weeks ${scope.from}–${scope.to}`;
  if (scope.type === "all") return "All weeks";
  return "";
}

async function init() {
  let manifest;
  try {
    manifest = await fetchModules();
  } catch {
    renderFatalError(
      document.querySelector("main"),
      "Couldn't load site data — check your connection, or that you're serving over http://, not opening the file directly."
    );
    return;
  }

  const slug = getQueryParam("m");
  const moduleObj = slug ? findModule(manifest, slug) : undefined;
  const scope = parseScope();

  if (!moduleObj || scope.type === "invalid") {
    renderNoCards(slug);
    return;
  }

  document.title = `${moduleObj.title} flashcards — Study`;
  document.getElementById("crumb").textContent = `${moduleObj.title} / Flashcards`;
  document.getElementById("flashcard-scope-label").textContent = scopeLabel(scope);

  const { cards, missingWeeks } = await loadCardsForWeeks(slug, moduleObj, weeksForScope(scope));
  if (cards.length === 0) {
    renderNoCards(slug, missingWeeks);
    return;
  }

  const state = loadState();
  let deck = state.shuffle ? shuffleArray(cards) : cards;
  let index = 0;
  let flipped = false;

  const flashcard = document.getElementById("flashcard");
  const front = document.getElementById("flashcard-front");
  const back = document.getElementById("flashcard-back");
  const progress = document.getElementById("flashcard-progress");
  const shuffleToggle = document.getElementById("shuffle-toggle");
  shuffleToggle.checked = !!state.shuffle;

  function render() {
    const card = deck[index];
    front.textContent = card.question;
    back.textContent = card.answer;
    flipped = false;
    flashcard.classList.remove("flipped");
    progress.textContent = `${index + 1} / ${deck.length}`;
  }

  function flip() {
    flipped = !flipped;
    flashcard.classList.toggle("flipped", flipped);
  }

  function go(delta) {
    index = Math.min(Math.max(index + delta, 0), deck.length - 1);
    render();
  }

  flashcard.addEventListener("click", flip);
  onKey(" ", (e) => {
    e.preventDefault();
    flip();
  });
  document.getElementById("flashcard-prev").addEventListener("click", () => go(-1));
  document.getElementById("flashcard-next").addEventListener("click", () => go(1));
  onKey("ArrowLeft", () => go(-1));
  onKey("ArrowRight", () => go(1));
  onSwipe(flashcard, { onLeft: () => go(1), onRight: () => go(-1) });

  shuffleToggle.addEventListener("change", () => {
    const newState = loadState();
    newState.shuffle = shuffleToggle.checked;
    saveState(newState);
    deck = shuffleToggle.checked ? shuffleArray(cards) : cards;
    index = 0;
    render();
  });

  render();
}

init();
