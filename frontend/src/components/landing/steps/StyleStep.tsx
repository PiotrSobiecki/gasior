import { stylesFor, type DrinkType } from "../../../lib/calc";
import { StepShell, selectableCardClass } from "./StepShell";

export function StyleStep({
  type,
  targetAbv,
  onSelect,
}: {
  type: DrinkType;
  targetAbv: number | null;
  onSelect: (abv: number) => void;
}) {
  const styles = stylesFor(type);
  const subtitle =
    type === "nalewka"
      ? "Im więcej spirytusu, tym mocniejsza nalewka."
      : "Im więcej cukru, tym mocniejszy i słodszy nastaw.";

  return (
    <StepShell title="Styl i moc" subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.abv)}
            className={selectableCardClass(targetAbv === s.abv)}
          >
            <p className="text-3xl font-bold text-[var(--color-bordo)]">
              {s.abv}%
            </p>
            <p className="mt-1 font-semibold text-stone-900">{s.label}</p>
            <p className="text-sm text-stone-500">{s.hint}</p>
          </button>
        ))}
      </div>
    </StepShell>
  );
}
