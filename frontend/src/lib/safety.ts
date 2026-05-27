import type { Recipe } from "./api";

export type SafetyWarning = {
  level: "warning" | "danger";
  title: string;
  message: string;
};

// Publicznie znane reguły bezpieczeństwa nastawów owocowych — duplikat wiedzy
// z `recipe-validator`, ale ograniczony do user-facing komunikatów (a nie
// pełnego raportu kuracji). Trzymamy je we frontendzie, bo backend nie
// wystawia tych ostrzeżeń w API.
const STONE_FRUITS = new Set([
  "śliwka",
  "sliwka",
  "wiśnia",
  "wisnia",
  "morela",
  "czereśnia",
  "czeresnia",
  "brzoskwinia",
]);

const PIT_CUE = /pestk|dryluj|wydryluj|nie rozgniataj/i;
const SANITATION_CUE = /dezynf|sanit|umyj|wyparz|sterylizu/i;

function mentions(steps: string[], cue: RegExp): boolean {
  return steps.some((s) => cue.test(s));
}

export function safetyWarnings(recipe: Recipe): SafetyWarning[] {
  const out: SafetyWarning[] = [];

  if (
    STONE_FRUITS.has(recipe.fruit.toLowerCase().trim()) &&
    !mentions(recipe.steps, PIT_CUE)
  ) {
    out.push({
      level: "danger",
      title: "Owoc pestkowy",
      message:
        "Wydryluj owoce i nie rozgniataj pestek — amigdalina uwalnia cyjanowodór. Aplikacja dotyczy fermentacji, nie destylacji.",
    });
  }

  if (!mentions(recipe.steps, SANITATION_CUE)) {
    out.push({
      level: "warning",
      title: "Brak kroku sanitarnego",
      message:
        "Receptura nie wspomina o dezynfekcji sprzętu — przed nastawieniem zawsze wyparz lub zdezynfekuj gąsior, rurkę i narzędzia.",
    });
  }

  return out;
}
