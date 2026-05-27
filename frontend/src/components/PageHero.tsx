import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  badge?: string;
  title: string;
  subtitle?: string;
  // Slot na element po prawej (np. status badge, akcje, breadcrumb).
  trailing?: ReactNode;
  // Slot pod podtytułem (np. linki, CTA).
  children?: ReactNode;
};

export function PageHero({ badge, title, subtitle, trailing, children }: Props) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-bordo)] text-[var(--color-cream)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--color-amber)]/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20">
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
