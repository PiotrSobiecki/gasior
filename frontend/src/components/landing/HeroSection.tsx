import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { pickRandomGasiorVideo } from "../../lib/batchStageAssets";

export function HeroSection({ onStart }: { onStart: () => void }) {
  const heroVideoSrc = useMemo(() => pickRandomGasiorVideo(), []);

  return (
    <section className="relative overflow-hidden bg-[var(--color-bordo)] text-[var(--color-cream)]">
      <video
        key={heroVideoSrc}
        src={heroVideoSrc}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        preload="auto"
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[var(--color-bordo)]/65"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 h-96 w-96 rounded-full bg-[var(--color-amber)]/15 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            🍷 Kreator nastawów
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl font-[var(--font-display)]">
            Zaplanuj idealny nastaw owocowy w kilku krokach
          </h1>
          <p className="mt-3 max-w-xl text-base text-[var(--color-cream)]/80 sm:text-lg">
            Wybierz typ trunku, owoc i moc — policzymy proporcje cukru, wody i
            drożdży oraz oszacujemy ABV. Bez zgadywania.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onStart}
              className="rounded-xl bg-[var(--color-amber)] px-6 py-3 font-semibold text-[#2a160a] shadow-lg transition hover:brightness-105 active:scale-95"
            >
              Oblicz nastaw →
            </button>
            <Link
              to="/receptury"
              className="rounded-xl border border-white/25 px-6 py-3 font-medium transition hover:bg-white/10"
            >
              Przeglądaj receptury
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
