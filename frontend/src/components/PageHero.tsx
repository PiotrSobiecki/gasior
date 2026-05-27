import { motion } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { pickRandomGasiorVideo } from "../lib/batchStageAssets";

type Props = {
  badge?: string;
  title: string;
  subtitle?: string;
  // Slot na element po prawej (np. status badge, akcje, breadcrumb).
  trailing?: ReactNode;
  // Slot pod podtytułem (np. linki, CTA).
  children?: ReactNode;
  // Opcjonalne tło MP4 (bez zmiany wysokości sekcji hero).
  withVideoBackground?: boolean;
};

export function PageHero({
  badge,
  title,
  subtitle,
  trailing,
  children,
  withVideoBackground = false,
}: Props) {
  const heroVideoSrc = useMemo(
    () => (withVideoBackground ? pickRandomGasiorVideo() : null),
    [withVideoBackground],
  );

  return (
    <section className="relative overflow-hidden bg-[var(--color-bordo)] text-[var(--color-cream)]">
      {heroVideoSrc && (
        <>
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
        </>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 h-96 w-96 rounded-full bg-[var(--color-amber)]/20 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                {badge}
              </span>
            )}
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl font-[var(--font-display)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 max-w-2xl text-lg text-[var(--color-cream)]/80">
                {subtitle}
              </p>
            )}
            {children && <div className="mt-6">{children}</div>}
          </div>
          {trailing && <div className="shrink-0">{trailing}</div>}
        </motion.div>
      </div>
    </section>
  );
}
