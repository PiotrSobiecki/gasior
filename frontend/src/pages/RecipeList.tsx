import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchRecipes,
  type Recipe,
  type RecipeCategory,
  type RecipeQuery,
} from "../lib/api";
import { fruitEmoji, FRUITS } from "../lib/fruits";
import { StatusBadge } from "../components/StatusBadge";
import { PageHero } from "../components/PageHero";

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  wino: "Wino",
  nalewka: "Nalewka",
  cydr: "Cydr",
  miod: "Miód pitny",
};
const CATEGORY_VALUES: RecipeCategory[] = ["wino", "nalewka", "cydr", "miod"];

function parseNumericParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// Konwertuje surowe URLSearchParams na RecipeQuery — nieznane wartości pomija,
// puste stringi traktuje jak brak filtra.
function searchParamsToQuery(sp: URLSearchParams): RecipeQuery {
  const category = sp.get("category");
  const validCategory =
    category && (CATEGORY_VALUES as string[]).includes(category)
      ? (category as RecipeCategory)
      : undefined;
  return {
    fruit: sp.get("fruit")?.trim() || undefined,
    category: validCategory,
    minAbv: parseNumericParam(sp.get("minAbv")),
    maxAbv: parseNumericParam(sp.get("maxAbv")),
    q: sp.get("q")?.trim() || undefined,
  };
}

function hasActiveFilters(q: RecipeQuery): boolean {
  return Boolean(
    q.category ||
      q.q ||
      q.fruit ||
      q.minAbv !== undefined ||
      q.maxAbv !== undefined,
  );
}

export function RecipeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => searchParamsToQuery(searchParams), [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recipes", query],
    queryFn: () => fetchRecipes(query),
  });

  const setCategory = (next: RecipeCategory | null) => {
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set("category", next);
    else sp.delete("category");
    setSearchParams(sp, { replace: true });
  };

  const setSearch = (text: string) => {
    const sp = new URLSearchParams(searchParams);
    if (text.trim()) sp.set("q", text);
    else sp.delete("q");
    setSearchParams(sp, { replace: true });
  };

  const setFruit = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set("fruit", next);
    else sp.delete("fruit");
    setSearchParams(sp, { replace: true });
  };

  const setAbvBound = (key: "minAbv" | "maxAbv", raw: string) => {
    const sp = new URLSearchParams(searchParams);
    if (raw.trim()) sp.set(key, raw);
    else sp.delete(key);
    setSearchParams(sp, { replace: true });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return (
    <>
      <PageHero
        badge="🏺 Biblioteka"
        title="Sprawdzone receptury nastawów"
        subtitle="Proporcje, kroki i źródła w jednym miejscu — wina owocowe, nalewki, cydry i miody pitne."
        withVideoBackground
        trailing={
          <Link
            to="/receptury/nowa"
            className="rounded-full bg-[var(--color-amber)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--color-bordo)] shadow transition hover:opacity-90"
          >
            + Dodaj recepturę
          </Link>
        }
      />

      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FilterBar
            query={query}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
            onFruitChange={setFruit}
            onAbvBoundChange={setAbvBound}
            onReset={resetFilters}
          />

          {isLoading && <SkeletonGrid />}

          {isError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
              Nie udało się pobrać receptur. Sprawdź, czy backend działa
              (<code>npm run dev</code> w <code>backend/</code>).
            </p>
          )}

          {data && data.length === 0 && (
            <EmptyState filtersActive={hasActiveFilters(query)} />
          )}

          {data && data.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {data.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FilterBar({
  query,
  onCategoryChange,
  onSearchChange,
  onFruitChange,
  onAbvBoundChange,
  onReset,
}: {
  query: RecipeQuery;
  onCategoryChange: (next: RecipeCategory | null) => void;
  onSearchChange: (text: string) => void;
  onFruitChange: (next: string) => void;
  onAbvBoundChange: (key: "minAbv" | "maxAbv", raw: string) => void;
  onReset: () => void;
}) {
  // Lista owoców do dropdownu: tylko kanoniczne formy z FRUITS (PL),
  // posortowane alfabetycznie polskim porządkiem.
  const fruitOptions = Object.keys(FRUITS).sort((a, b) =>
    a.localeCompare(b, "pl"),
  );

  const filtersActive =
    Boolean(query.category) ||
    Boolean(query.q) ||
    Boolean(query.fruit) ||
    query.minAbv !== undefined ||
    query.maxAbv !== undefined;

  return (
    <div className="mb-8 space-y-4 rounded-3xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Filtr kategorii"
          className="flex flex-wrap gap-2"
        >
          <CategoryPill
            active={!query.category}
            onClick={() => onCategoryChange(null)}
            label="Wszystkie"
          />
          {CATEGORY_VALUES.map((c) => (
            <CategoryPill
              key={c}
              active={query.category === c}
              onClick={() => onCategoryChange(c)}
              label={CATEGORY_LABELS[c]}
            />
          ))}
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-[var(--color-bordo)]"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm focus-within:border-[var(--color-bordo)]/40">
          <span className="text-stone-400" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            aria-label="Szukaj receptury"
            placeholder="Szukaj po nazwie lub owocu…"
            value={query.q ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-stone-400"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-600">
          <span className="sr-only">Filtr owocu</span>
          <select
            aria-label="Filtr owocu"
            value={query.fruit ?? ""}
            onChange={(e) => onFruitChange(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Wszystkie owoce</option>
            {fruitOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span>ABV</span>
          <input
            type="number"
            min={0}
            max={25}
            step={1}
            aria-label="ABV od"
            value={query.minAbv ?? ""}
            onChange={(e) => onAbvBoundChange("minAbv", e.target.value)}
            placeholder="od"
            className="w-16 rounded-full border border-stone-200 px-3 py-1.5 text-sm"
          />
          <span aria-hidden>–</span>
          <input
            type="number"
            min={0}
            max={25}
            step={1}
            aria-label="ABV do"
            value={query.maxAbv ?? ""}
            onChange={(e) => onAbvBoundChange("maxAbv", e.target.value)}
            placeholder="do"
            className="w-16 rounded-full border border-stone-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? "bg-[var(--color-bordo)] text-[var(--color-cream)]"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ filtersActive }: { filtersActive: boolean }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-amber)]/15 text-3xl">
        {filtersActive ? "🔎" : "🌱"}
      </div>
      <h2 className="mt-5 text-xl font-semibold text-stone-900">
        {filtersActive
          ? "Brak receptur w wybranych filtrach"
          : "Brak receptur"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-stone-500">
        {filtersActive ? (
          <>Spróbuj rozszerzyć kryteria lub wyczyść filtry.</>
        ) : (
          <>
            Użyj subagenta <code>recipe-researcher</code>, by znaleźć przepisy,
            a <code>recipe-validator</code> je sprawdzi.
          </>
        )}
      </p>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/receptury/${recipe.id}`}
      className="group block rounded-3xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--color-bordo)]/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bordo)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-amber)]/15 text-2xl">
          {fruitEmoji(recipe.fruit)}
        </div>
        <StatusBadge status={recipe.status} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-stone-900 group-hover:text-[var(--color-bordo)]">
        {recipe.name}
      </h2>
      <p className="text-sm capitalize text-stone-500">{recipe.fruit}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Stat label="Cukier" value={`${recipe.sugarKg} kg`} />
        <Stat label="Woda" value={`${recipe.waterL} l`} />
        <Stat label="ABV" value={`${recipe.targetAbv}%`} />
        <Stat label="Fermentacja" value={`${recipe.fermentationDays} dni`} />
      </dl>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-stone-800">{value}</dd>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-3xl border border-stone-200 bg-white/70"
        />
      ))}
    </div>
  );
}
