import type { User } from "./api";

// Wybiera tekstową etykietę dla zalogowanego usera. Preferujemy `displayName`
// (jeśli był podany przy rejestracji), w razie braku — część emaila przed @
// (rzadko sensowna, ale lepsza niż nic). Pusty string traktujemy jak brak.

export function userDisplayName(user: Pick<User, "displayName" | "email">): string {
  const name = user.displayName?.trim();
  if (name) return name;
  const [local] = user.email.split("@");
  return local || user.email;
}

// Pierwsza litera nazwy (wielką literą) — do awatara-kółka. Dla nie-ASCII
// (np. ąć ąść) `toUpperCase` zwróci poprawny znak; obsługa par surogatów
// (emoji) wykracza poza potrzeby — w `displayName` nie spodziewamy się emoji.

export function userInitial(user: Pick<User, "displayName" | "email">): string {
  const name = userDisplayName(user);
  return name.charAt(0).toLocaleUpperCase("pl-PL");
}
