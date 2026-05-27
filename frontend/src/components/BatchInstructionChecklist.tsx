import { useEffect, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  steps: string[];
  checkedStepIndices: number[];
  canEdit: boolean;
  onCheckedChange?: (indices: number[]) => void | Promise<void>;
};

export function BatchInstructionChecklist({
  title,
  subtitle,
  steps,
  checkedStepIndices,
  canEdit,
  onCheckedChange,
}: Props) {
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(checkedStepIndices),
  );

  useEffect(() => {
    setChecked(new Set(checkedStepIndices));
  }, [checkedStepIndices]);

  function toggle(index: number) {
    if (!canEdit) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      const indices = [...next].sort((a, b) => a - b);
      void onCheckedChange?.(indices);
      return next;
    });
  }

  const doneCount = checked.size;
  const total = steps.length;

  return (
    <article
      aria-labelledby="batch-instruction-title"
      className="rounded-3xl border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="batch-instruction-title"
            className="text-sm font-medium uppercase tracking-wide text-[var(--color-bordo)]"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-lg font-semibold text-stone-900">{subtitle}</p>
          )}
        </div>
        <p className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-stone-600">
          {doneCount}/{total} kroków
        </p>
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const isDone = checked.has(i);
          return (
            <li key={i}>
              <label
                className={`flex cursor-pointer gap-3 rounded-2xl border px-3 py-3 transition ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-stone-200/80 bg-white/60 hover:border-[var(--color-bordo)]/30"
                } ${!canEdit ? "cursor-default" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  disabled={!canEdit}
                  onChange={() => toggle(i)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-bordo)]"
                  aria-label={`Krok ${i + 1}`}
                />
                <span className="flex gap-3 text-sm text-stone-700">
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--color-amber)]/40 text-[var(--color-bordo)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={isDone ? "text-stone-500 line-through" : ""}>
                    {step}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      {!canEdit && (
        <p className="mt-4 text-xs text-stone-500">
          Tryb podglądu — checklistę może edytować tylko właściciel nastawu.
        </p>
      )}
    </article>
  );
}
