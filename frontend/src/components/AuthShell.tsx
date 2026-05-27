import type { ReactNode } from "react";
import { PageHero } from "./PageHero";

type Props = {
  badge: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  // Slot pod kartą formularza — linki "Nie masz konta?" itp.
  footer?: ReactNode;
};

// Wspólna otoczka stron auth: hero + wycentrowana karta z formularzem.
// Wyciągnięte, żeby login/rejestracja/aktywacja/reset miały identyczny
// layout i nie powielały klas Tailwinda.
export function AuthShell({ badge, title, subtitle, children, footer }: Props) {
  return (
    <>
      <PageHero badge={badge} title={title} subtitle={subtitle} />
      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-md space-y-5 px-6">
          <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            {children}
          </div>
          {footer && <div className="text-center text-sm text-stone-600">{footer}</div>}
        </div>
      </section>
    </>
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
