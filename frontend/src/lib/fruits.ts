// Jedno źródło prawdy o owocach — emoji + odmiana w dopełniaczu („z czego").
// `withGenitive` to GOTOWA fraza z przyimkiem (uwzględnia „z" → „ze"
// przed grupami spółgłosek), żeby uniknąć błędów typu „wino z malina".

export type FruitInfo = {
  emoji: string;
  // Pełna fraza z przyimkiem: „wino z malin", „wino ze śliwek", „wino z aronii".
  withGenitive: string;
};

// Klucze KANONICZNE — z polskimi znakami. Wyłącznie ich używamy do
// wyświetlania (np. w dropdownie filtra), żeby nie mieszać form.
export const FRUITS: Record<string, FruitInfo> = {
  aronia: { emoji: "🫐", withGenitive: "z aronii" },
  jabłko: { emoji: "🍎", withGenitive: "z jabłek" },
  śliwka: { emoji: "🟣", withGenitive: "ze śliwek" },
  wiśnia: { emoji: "🍒", withGenitive: "z wiśni" },
  porzeczka: { emoji: "⚫", withGenitive: "z porzeczek" },
  malina: { emoji: "🔴", withGenitive: "z malin" },
  agrest: { emoji: "🟢", withGenitive: "z agrestu" },
  gruszka: { emoji: "🍐", withGenitive: "z gruszek" },
  truskawka: { emoji: "🍓", withGenitive: "z truskawek" },
  winogrono: { emoji: "🍇", withGenitive: "z winogron" },
};

// Aliasy ASCII (bez polskich znaków) — TYLKO do lookupu, gdy URL/API dostarcza
// formę bez diakrytyków. Nie pokazujemy ich nigdy w UI.
const FRUIT_ALIASES: Record<string, string> = {
  jablko: "jabłko",
  sliwka: "śliwka",
  wisnia: "wiśnia",
};

const FALLBACK: FruitInfo = { emoji: "🍇", withGenitive: "" };

export function canonicalFruit(fruit: string): string {
  const key = fruit.toLowerCase().trim();
  return FRUIT_ALIASES[key] ?? key;
}

export function fruitEmoji(fruit: string): string {
  return FRUITS[canonicalFruit(fruit)]?.emoji ?? FALLBACK.emoji;
}

// Zwraca poprawną polską frazę „z X" / „ze X" w dopełniaczu.
// Dla nieznanego owocu fallback: „z {fruit}" (lepsze niż nic).
export function fruitWithGenitive(fruit: string): string {
  const info = FRUITS[canonicalFruit(fruit)];
  return info ? info.withGenitive : `z ${fruit}`;
}
