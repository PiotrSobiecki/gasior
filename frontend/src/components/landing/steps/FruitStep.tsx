import { StepShell, selectableCardClass } from "./StepShell";
import { fruitEmoji } from "../../../lib/fruits";

// Owoce dostępne w kreatorze (kolejność do prezentacji).
// Emoji i odmiana — z `lib/fruits.ts` jako jedyne źródło prawdy.
const FRUIT_IDS = [
  "aronia",
  "jabłko",
  "śliwka",
  "wiśnia",
  "porzeczka",
  "malina",
  "agrest",
  "gruszka",
  "truskawka",
];

export function FruitStep({
  fruit,
  waterL,
  onFruitChange,
  onWaterChange,
}: {
  fruit: string | null;
  waterL: number;
  onFruitChange: (fruit: string) => void;
  onWaterChange: (waterL: number) => void;
}) {
  return (
    <StepShell
      title="Owoc i ilość"
      subtitle="Wybierz owoc i docelową objętość nastawu."
    >
      <div className="grid grid-cols-3 gap-3">
        {FRUIT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onFruitChange(id)}
            className={selectableCardClass(fruit === id)}
          >
            <span className="block text-2xl">{fruitEmoji(id)}</span>
            <span className="mt-1 block text-sm font-medium capitalize text-stone-700">
              {id}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <label htmlFor="water" className="flex items-baseline justify-between">
          <span className="font-medium text-stone-800">Docelowa objętość</span>
          <span className="text-lg font-bold text-[var(--color-bordo)]">
            {waterL} l
          </span>
        </label>
        <input
          id="water"
          type="range"
          min={3}
          max={50}
          step={1}
          value={waterL}
          onChange={(e) => onWaterChange(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--color-bordo)]"
        />
        <div className="mt-1 flex justify-between text-xs text-stone-400">
          <span>3 l</span>
          <span>50 l</span>
        </div>
      </div>
    </StepShell>
  );
}
