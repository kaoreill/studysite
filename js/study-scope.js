// study-scope.js — parses the week-scope query params (single week / range /
// all) and loads the card decks for them. Shared by flashcards.js and quiz.js.
import { findWeek } from "./common.js";

export function parseScope(search = window.location.search) {
  const params = new URLSearchParams(search);
  const w = params.get("w");
  const from = params.get("from");
  const to = params.get("to");

  if (w === "all") return { type: "all" };
  if (w !== null) {
    const week = Number(w);
    if (Number.isInteger(week) && week >= 1 && week <= 13) return { type: "week", week };
    return { type: "invalid" };
  }
  if (from !== null && to !== null) {
    const fromNum = Number(from);
    const toNum = Number(to);
    if (Number.isInteger(fromNum) && Number.isInteger(toNum) && fromNum >= 1 && toNum <= 13 && fromNum <= toNum) {
      return { type: "range", from: fromNum, to: toNum };
    }
    return { type: "invalid" };
  }
  return { type: "invalid" };
}

export function weeksForScope(scope) {
  if (scope.type === "week") return [scope.week];
  if (scope.type === "range") {
    const weeks = [];
    for (let n = scope.from; n <= scope.to; n++) weeks.push(n);
    return weeks;
  }
  if (scope.type === "all") return Array.from({ length: 13 }, (_, i) => i + 1);
  return [];
}

export async function fetchCardFile(moduleSlug, filename) {
  try {
    const res = await fetch(`cards/${moduleSlug}/${filename}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadCardsForWeeks(moduleSlug, moduleObj, weekNumbers, fetchCardFileFn = fetchCardFile) {
  const cards = [];
  const missingWeeks = [];
  for (const weekNumber of weekNumbers) {
    const weekObj = findWeek(moduleObj, weekNumber);
    if (!weekObj || weekObj.cards === null) {
      missingWeeks.push(weekNumber);
      continue;
    }
    const cardFile = await fetchCardFileFn(moduleSlug, weekObj.cards);
    if (!cardFile) {
      missingWeeks.push(weekNumber);
      continue;
    }
    for (const card of cardFile.cards) {
      cards.push({ ...card, week: weekNumber });
    }
  }
  return { cards, missingWeeks };
}

export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
