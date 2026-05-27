import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl px-4 py-8"
    >
      <h2 className="text-2xl font-bold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-1 text-stone-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </motion.div>
  );
}

export function selectableCardClass(selected: boolean) {
  return `rounded-2xl border-2 p-5 text-left transition active:scale-[0.98] ${
    selected
      ? "border-[var(--color-bordo)] bg-[var(--color-bordo)]/5 shadow-sm"
      : "border-stone-200 bg-white hover:border-stone-300"
  }`;
}
