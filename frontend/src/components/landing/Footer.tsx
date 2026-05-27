// Slim footer — bez powielania nawigacji (jest w NavBarze).
// Trzyma jedynie tożsamość marki + krótkie context line.

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-bordo)] text-[var(--color-cream)]">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-[var(--font-display)] text-lg font-bold">
            <span className="inline-flex items-center gap-2">
              <img
                src="/icon.png"
                alt=""
                className="h-8 w-8 object-contain"
                width={32}
                height={32}
                aria-hidden
              />
              Gąsior
            </span>
          </span>
          <span className="text-sm text-[var(--color-cream)]/70">
            Domowa fermentacja — pij z głową.
          </span>
        </div>
        <p className="text-xs leading-none text-[var(--color-cream)]/50 sm:self-center">
          Projekt robiony pod wpływem ... · {year}
        </p>
      </div>
    </footer>
  );
}
