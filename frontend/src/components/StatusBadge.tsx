import type { Recipe } from "../lib/api";

type Props = {
  status: Recipe["status"];
  // "light" (default) — do użycia na jasnym tle (karty, sekcje cream/białe).
  // "dark"  — do użycia na ciemnym (bordo) tle, np. w PageHero.
  tone?: "light" | "dark";
};

export function StatusBadge({ status, tone = "light" }: Props) {
  const validated = status === "validated";
  const label = validated ? "zweryfikowana" : "szkic";

  const classes =
    tone === "dark"
      ? validated
        ? "bg-[var(--color-leaf)] text-white"
        : "bg-amber-300 text-amber-950"
      : validated
        ? "bg-[var(--color-leaf)]/15 text-[var(--color-leaf)]"
        : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
