// quiz.js — multiple-choice quiz mode for a scoped set of weeks.
import { fetchModules, findModule, getQueryParam, renderFatalError, onKey, loadState, saveState } from "./common.js";
import { parseScope, weeksForScope, loadCardsForWeeks, shuffleArray } from "./study-scope.js";

export function buildQuizQuestion(card) {
  const options = shuffleArray([card.answer, ...card.distractors]);
  return {
    id: card.id,
    question: card.question,
    options,
    correctIndex: options.indexOf(card.answer),
  };
}

export function scoreForWeekKey(moduleSlug, week) {
  return `${moduleSlug}-w${String(week).padStart(2, "0")}`;
}

function renderNoCards(moduleSlug, missingWeeks = []) {
  const extra = missingWeeks.length
    ? ` (no card decks for week${missingWeeks.length > 1 ? "s" : ""} ${missingWeeks.join(", ")})`
    : "";
  document.getElementById("quiz-content").innerHTML = `
    <p class="fatal-error">
      No cards found for this selection${extra}.
      <a href="module.html?m=${moduleSlug || ""}">Back to module</a>.
    </p>
  `;
}

function runQuiz(cardsByCard, { moduleSlug, scope, onFinish }) {
  const questions = cardsByCard.map((card) => ({ card, question: buildQuizQuestion(card) }));
  let current = 0;
  let score = 0;
  const missedCards = [];
  let answered = false;

  const questionEl = document.getElementById("quiz-question");
  const optionsEl = document.getElementById("quiz-options");
  const feedbackEl = document.getElementById("quiz-feedback");
  const scoreEl = document.getElementById("quiz-score");
  const nextBtn = document.getElementById("quiz-next");
  const questionSection = document.getElementById("quiz-question-section");
  const endSection = document.getElementById("quiz-end");

  function renderQuestion() {
    answered = false;
    feedbackEl.textContent = "";
    nextBtn.hidden = true;
    const { question } = questions[current];
    questionEl.textContent = question.question;
    scoreEl.textContent = `Score: ${score} / ${current}`;
    optionsEl.innerHTML = "";
    question.options.forEach((option, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn quiz-option";
      btn.dataset.index = String(i);
      btn.textContent = option;
      btn.addEventListener("click", () => selectOption(i));
      optionsEl.appendChild(btn);
    });
  }

  function selectOption(i) {
    if (answered) return;
    answered = true;
    const { card, question } = questions[current];
    const correct = i === question.correctIndex;
    if (correct) score++;
    else missedCards.push(card);

    [...optionsEl.children].forEach((btn, idx) => {
      if (idx === question.correctIndex) btn.classList.add("quiz-option--correct");
      if (idx === i && !correct) btn.classList.add("quiz-option--incorrect");
    });
    feedbackEl.textContent = correct ? "Correct!" : "Incorrect.";
    scoreEl.textContent = `Score: ${score} / ${current + 1}`;
    nextBtn.hidden = false;
  }

  function next() {
    if (!answered) return;
    current++;
    if (current < questions.length) {
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    questionSection.hidden = true;
    endSection.hidden = false;
    document.getElementById("quiz-final-score").textContent = `${score} / ${questions.length}`;
    const retryBtn = document.getElementById("quiz-retry-wrong");
    retryBtn.hidden = missedCards.length === 0;
    retryBtn.onclick = () => {
      questionSection.hidden = false;
      endSection.hidden = true;
      runQuiz(missedCards, { moduleSlug, scope, onFinish: null });
    };
    onFinish?.(score, questions.length);
  }

  nextBtn.addEventListener("click", next);
  onKey("1", () => selectOption(0));
  onKey("2", () => selectOption(1));
  onKey("3", () => selectOption(2));
  onKey("4", () => selectOption(3));

  questionSection.hidden = false;
  endSection.hidden = true;
  renderQuestion();
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

  document.title = `${moduleObj.title} quiz — Study`;
  document.getElementById("crumb").textContent = `${moduleObj.title} / Quiz`;

  const { cards, missingWeeks } = await loadCardsForWeeks(slug, moduleObj, weeksForScope(scope));
  if (cards.length === 0) {
    renderNoCards(slug, missingWeeks);
    return;
  }

  runQuiz(cards, {
    moduleSlug: slug,
    scope,
    onFinish(finalScore, total) {
      if (scope.type !== "week") return;
      const state = loadState();
      state.scores ??= {};
      const key = scoreForWeekKey(slug, scope.week);
      const existing = state.scores[key];
      state.scores[key] = {
        best: Math.max(existing?.best ?? 0, finalScore),
        total,
        last: new Date().toISOString().slice(0, 10),
      };
      saveState(state);
    },
  });
}

init();
