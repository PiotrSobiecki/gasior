const FAQ = [
  {
    q: "Skąd biorą się proporcje?",
    a: "Z reguły ~17 g cukru na litr daje ok. 1% ABV. Na tej podstawie liczymy cukier potrzebny do wybranej mocy w danej objętości.",
  },
  {
    q: "Czy to dokładne wartości?",
    a: "To dobry punkt wyjścia. Naturalny cukier z owoców i tolerancja drożdży mogą wpłynąć na wynik — traktuj liczby jako orientacyjne.",
  },
  {
    q: "Czy aplikacja dotyczy destylacji?",
    a: "Nie. Gąsior dotyczy wyłącznie fermentacji owoców (wina, nalewki, cydry, miody pitne).",
  },
  {
    q: "Co z bezpieczeństwem?",
    a: "Zawsze dezynfekuj sprzęt i używaj rurki fermentacyjnej. Przy owocach pestkowych nie rozgniataj pestek.",
  },
];

export function FaqSection() {
  return (
    <section className="bg-[var(--color-cream)] py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-bold text-stone-900">
          Częste pytania
        </h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-stone-200 bg-white p-5"
            >
              <summary className="cursor-pointer list-none font-semibold text-stone-900 marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="text-[var(--color-bordo)] transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-stone-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
