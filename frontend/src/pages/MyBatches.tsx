import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BATCH_STAGE_LABELS,
  listMyBatches,
  type BatchPublic,
} from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { PageHero } from "../components/PageHero";
import { GasiorStageImage } from "../components/GasiorStageImage";
import { daysSinceStart, formatDaysSince } from "../lib/batchTimeline";
import type { BatchStage } from "../lib/api";

function BatchCard({ batch }: { batch: BatchPublic }) {
  const days = daysSinceStart(batch.startDate);
  const stage = batch.stage as BatchStage;

  return (
    <Link
      to={`/nastaw/${batch.viewSlug}`}
      className="group block rounded-3xl border border-stone-200 bg-[#F0EDD9] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-bordo)]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <GasiorStageImage stage={stage} size="sm" className="shrink-0" />
        <h3 className="min-w-0 flex-1 text-lg font-semibold text-stone-800 group-hover:text-[var(--color-bordo)]">
          {batch.name}
        </h3>
        {batch.isDemo && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Demo
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5">
          {BATCH_STAGE_LABELS[batch.stage] ?? batch.stage}
        </span>
        <span className="text-stone-500">{formatDaysSince(days)}</span>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Start: {new Date(batch.startDate).toLocaleDateString("pl-PL")}
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white/50 p-10 text-center">
      <p className="text-3xl">🫙</p>
      <h2 className="mt-3 text-xl font-semibold text-stone-800">
        Pusto jak w gąsiorze przed nastawem
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Nie masz jeszcze żadnych nastawów. Wybierz recepturę albo wystartuj
        od zera — wszystko zapiszemy na Twoim koncie.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/receptury"
          className="rounded-full border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Przeglądaj receptury
        </Link>
        <Link
          to="/nastawy/nowy"
          className="rounded-full bg-[var(--color-bordo)] px-5 py-2 text-sm font-medium text-[var(--color-cream)] transition hover:opacity-90"
        >
          Załóż pierwszy nastaw
        </Link>
      </div>
    </div>
  );
}

export function MyBatches() {
  // RequireAuth gwarantuje, że user jest zalogowany — tu używamy go tylko do
  // spersonalizowania powitania. Brak jest defensywą, gdyby cache się rozjechał.
  const { data: user } = useCurrentUser();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-batches"],
    queryFn: listMyBatches,
  });

  const greeting = user?.displayName
    ? `Cześć, ${user.displayName}!`
    : "Twoje nastawy";

  return (
    <>
      <PageHero
        badge="🍷 Twoje gąsiory"
        title={greeting}
        subtitle="Wszystkie nastawy w jednym miejscu. Wybierz, by zaglądnąć w pomiary, dziennik i kolejne kroki."
        withVideoBackground
        trailing={
          <Link
            to="/nastawy/nowy"
            className="rounded-full bg-[var(--color-amber)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--color-bordo)] shadow transition hover:opacity-90"
          >
            + Załóż nowy
          </Link>
        }
      />

      <section className="bg-[var(--color-cream)] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {isLoading && (
            <p className="text-sm text-stone-500">Ładuję nastawy…</p>
          )}

          {isError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
            >
              Nie udało się pobrać listy nastawów.
              <button
                type="button"
                onClick={() => refetch()}
                className="ml-2 underline hover:no-underline"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}

          {data && data.length === 0 && <EmptyState />}

          {data && data.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((batch) => (
                <li key={batch.id}>
                  <BatchCard batch={batch} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
