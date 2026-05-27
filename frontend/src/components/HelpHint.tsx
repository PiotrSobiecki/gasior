import { useId, type ReactNode } from "react";

// Drobny komponent pomocy „?" obok labela. Tooltip pokazuje się na hover oraz
// gdy ikonka dostanie focus (klawiatura, czytniki ekranu). Świadomie bez
// portalu — popover renderujemy in-place w kontenerze relative; przy gridzie
// pomiarów wystarcza, bo karty mają sporo miejsca pod sobą.
//
// `aria-label` przycisku jest świadomie generyczny („Pokaż wyjaśnienie"), żeby
// nie powielać nazwy labela (RTL by zwracał przycisk razem z inputem przy
// `getByLabelText`). Treść pomocy znajduje się w samym tooltipie (role=tooltip).

export function HelpHint({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <span className="relative inline-flex items-center group align-middle">
      <button
        type="button"
        aria-label="Pokaż wyjaśnienie"
        aria-describedby={id}
        tabIndex={0}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 text-[10px] font-semibold text-stone-500 hover:border-[var(--color-bordo)] hover:text-[var(--color-bordo)] focus:border-[var(--color-bordo)] focus:text-[var(--color-bordo)] focus:outline-none"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className="invisible absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-3 text-xs font-normal leading-snug text-stone-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
