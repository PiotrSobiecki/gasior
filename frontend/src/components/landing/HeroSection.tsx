import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-bordo)] text-[var(--color-cream)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--color-amber)]/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            🍷 Kreator nastawów
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl font-[var(--font-display)]">
            Zaplanuj idealny nastaw owocowy w kilku krokach
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--color-cream)]/80">
            Wybierz typ trunku, owoc i moc — policzymy proporcje cukru, wody i
            drożdży oraz oszacujemy ABV. Bez zgadywania.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              onClick={onStart}
              className="rounded-xl bg-[var(--color-amber)] px-7 py-3.5 font-semibold text-[#2a160a] shadow-lg transition hover:brightness-105 active:scale-95"
            >
              Oblicz nastaw →
            </button>
            <Link
              to="/receptury"
              className="rounded-xl border border-white/25 px-7 py-3.5 font-medium transition hover:bg-white/10"
            >
              Przeglądaj receptury
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
