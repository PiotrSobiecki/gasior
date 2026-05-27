const STEPS = ["Typ", "Owoc i ilość", "Styl", "Wynik"];

export function ProgressIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-12">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => i <= currentStep && onStepClick(i)}
                disabled={i > currentStep}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--color-bordo)] text-white"
                    : done
                      ? "bg-[var(--color-leaf)] text-white"
                      : "bg-stone-200 text-stone-500"
                } ${i <= currentStep ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : i + 1}
              </button>
              <span
                className={`hidden text-sm sm:inline ${
                  active ? "font-semibold text-stone-800" : "text-stone-400"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 h-px flex-1 bg-stone-200" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
