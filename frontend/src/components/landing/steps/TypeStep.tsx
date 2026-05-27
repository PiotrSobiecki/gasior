import { DRINK_TYPES, type DrinkType } from "../../../lib/calc";
import { StepShell, selectableCardClass } from "./StepShell";

export function TypeStep({
  selected,
  onSelect,
}: {
  selected: DrinkType | null;
  onSelect: (type: DrinkType) => void;
}) {
  const types = Object.entries(DRINK_TYPES) as [
    DrinkType,
    (typeof DRINK_TYPES)[DrinkType],
  ][];

  return (
    <StepShell title="Co chcesz zrobić?" subtitle="Wybierz typ trunku.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {types.map(([id, cfg]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={selectableCardClass(selected === id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cfg.emoji}</span>
              <div>
                <p className="font-semibold text-stone-900">{cfg.label}</p>
                <p className="text-sm text-stone-500">{cfg.hint}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </StepShell>
  );
}
