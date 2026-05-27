import type { ReactNode } from "react";
import { PageHero } from "./PageHero";

type Props = {
  badge: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  // Slot pod kartą formularza — linki "Nie masz konta?" itp.
  footer?: ReactNode;
  /** Szersza karta i więcej oddechu — ekrany „sprawdź skrzynkę”. */
  variant?: "form" | "success";
};

// Wspólna otoczka stron auth: hero + wycentrowana karta z formularzem.
export function AuthShell({
  badge,
  title,
  subtitle,
  children,
  footer,
  variant = "form",
}: Props) {
  const isSuccess = variant === "success";
  return (
    <>
      <PageHero badge={badge} title={title} subtitle={subtitle} />
      <section className="bg-[var(--color-cream)] py-16 sm:py-20">
        <div
          className={`mx-auto space-y-6 px-6 ${isSuccess ? "max-w-xl" : "max-w-md space-y-5"}`}
        >
          <div
            className={`rounded-3xl border bg-white shadow-sm ${
              isSuccess
                ? "border-[var(--color-bordo)]/15 p-8 sm:p-10"
                : "space-y-5 border-stone-200 p-6"
            }`}
          >
            {children}
          </div>
          {footer && (
            <div className={`text-center ${isSuccess ? "" : "text-sm text-stone-600"}`}>
              {footer}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

type AuthSuccessPanelProps = {
  icon: string;
  email: string;
  /** Krótkie kroki / wskazówki pod adresem e-mail. */
  tips: string[];
};

/** Ekran po wysłaniu maila (rejestracja, reset hasła) — w palecie Gąsiora. */
export function AuthSuccessPanel({ icon, email, tips }: AuthSuccessPanelProps) {
  return (
    <div className="space-y-8 text-center">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--color-bordo)]/25 bg-gradient-to-b from-[var(--color-cream)] to-white text-5xl shadow-[inset_0_2px_12px_rgba(107,31,42,0.08)]"
        aria-hidden
      >
        {icon}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-bordo)]/70">
          Wiadomość trafi na
        </p>
        <p className="break-all font-[var(--font-display)] text-2xl font-bold leading-snug text-[var(--color-bordo)] sm:text-3xl">
          {email}
        </p>
      </div>

      <ul className="space-y-4 border-t border-stone-200/80 pt-8 text-left">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-3 text-base leading-relaxed text-stone-700">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bordo)] text-xs font-bold text-[var(--color-cream)]"
              aria-hidden
            >
              ✓
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Drobne klasy do pól w formularzach — żeby trzymać spójność i nie kopiować
// długich łańcuchów Tailwinda po komponentach.
export const inputClass =
  "mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60";

export const labelClass = "block text-sm font-medium text-stone-700";

export const primaryButtonClass =
  "w-full rounded-full bg-[var(--color-bordo)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:opacity-90 disabled:opacity-50";

export const errorBoxClass =
  "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800";

export const infoBoxClass =
  "rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800";
