import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchRecipe } from "../lib/api";
import { fruitEmoji } from "../lib/fruits";
import { safetyWarnings, type SafetyWarning } from "../lib/safety";
import { StatusBadge } from "../components/StatusBadge";
import { PageHero } from "../components/PageHero";

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetchRecipe(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <>
        <PageHero title="Ładowanie receptury…" />
        <section className="bg-[var(--color-cream)] py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="h-64 animate-pulse rounded-3xl border border-stone-200 bg-white/70" />
          </div>
        </section>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHero title="Nie znaleziono receptury" />
        <section className="bg-[var(--color-cream)] py-16">
          <div className="mx-auto max-w-4xl px-6">
            <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
              {(error as Error).message}
            </p>
            <Link
              to="/receptury"
              className="mt-6 inline-block text-[var(--color-bordo)] hover:underline"
            >
              ← Wróć do receptur
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <PageHero
        badge={`${fruitEmoji(data.fruit)} ${data.fruit}`}
        title={data.name}
        subtitle={`${data.targetAbv}% ABV · ${data.fermentationDays} dni fermentacji`}
        trailing={<StatusBadge status={data.status} tone="dark" />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/receptury"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            ← Wszystkie receptury
          </Link>
          <Link
            to={`/nastawy/nowy?recipeId=${data.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-amber)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bordo)] shadow-sm transition hover:opacity-90"
          >
            Załóż nastaw z tej receptury
          </Link>
        </div>
      </PageHero>

      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          <SafetyBanner warnings={safetyWarnings(data)} />

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
              Proporcje
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <Stat label="Owoce" value={`${data.fruitKg} kg`} />
              <Stat label="Cukier" value={`${data.sugarKg} kg`} />
              <Stat label="Woda" value={`${data.waterL} l`} />
              <Stat label="Drożdże" value={data.yeastType} />
              <Stat label="Docelowe ABV" value={`${data.targetAbv}%`} />
              <Stat label="Fermentacja" value={`${data.fermentationDays} dni`} />
            </dl>
          </article>

          {data.steps.length > 0 && (
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
                Kroki
              </h2>
              <ol className="mt-4 space-y-3">
                {data.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-amber)]/15 text-sm font-semibold text-[var(--color-bordo)]">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-stone-700">{step}</p>
                  </li>
                ))}
              </ol>
            </article>
          )}

          {data.sourceUrls.length > 0 && (
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-stone-400">
                Źródła
              </h2>
              <ul className="mt-4 space-y-2">
                {data.sourceUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-[var(--color-bordo)] hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
      </section>
    </>
  );
}

function SafetyBanner({ warnings }: { warnings: SafetyWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <aside
      role="alert"
      aria-label="Ostrzeżenia bezpieczeństwa"
      className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
        <span aria-hidden>⚠️</span> Bezpieczeństwo
      </h2>
      <ul className="mt-4 space-y-3">
        {warnings.map((w) => (
          <li key={w.title} className="text-sm text-amber-950">
            <p className="font-semibold">
              {w.level === "danger" ? "🚫 " : ""}
              {w.title}
            </p>
            <p className="mt-1 text-amber-900/90">{w.message}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
