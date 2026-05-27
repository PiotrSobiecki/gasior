const STEPS = [
  {
    emoji: "🍷",
    title: "Wybierz typ i owoc",
    text: "Wino, nalewka, cydr czy miód pitny — i z czego.",
  },
  {
    emoji: "⚖️",
    title: "Ustaw moc i ilość",
    text: "Suwakiem objętość, klikiem docelowe ABV.",
  },
  {
    emoji: "📋",
    title: "Dostań proporcje",
    text: "Cukier, woda, drożdże i czas — gotowe do nastawu.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold text-stone-900">
          Jak to działa
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-stone-200 p-6 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-amber)]/15 text-3xl">
                {s.emoji}
              </div>
              <p className="mt-4 text-sm font-medium text-stone-400">
                Krok {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-stone-900">
                {s.title}
              </h3>
              <p className="mt-2 text-stone-500">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
