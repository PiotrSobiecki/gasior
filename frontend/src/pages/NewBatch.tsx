import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ApiValidationError,
  BatchAuthError,
  createBatch,
  fetchRecipe,
  fetchRecipes,
  type Recipe,
  type RecipeCategory,
} from "../lib/api";
import type { DrinkType } from "../lib/calc";
import { buildWizardSteps } from "../lib/recipeAlignment";
import { PageHero } from "../components/PageHero";

export function NewBatch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recipeId = searchParams.get("recipeId");
  const initialNameFromQuery = searchParams.get("name")?.trim() ?? "";
  const creatorType = searchParams.get("type");
  const creatorFruit = searchParams.get("fruit");
  const creatorWaterL = searchParams.get("waterL");
  const creatorTargetAbv = searchParams.get("targetAbv");

  // Gdy URL ma ?recipeId, pobieramy recepturę (cache TanStack Query). Nazwa
  // nastawu zostanie wstępnie wypełniona po sukcesie.
  const recipeQuery = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipe(recipeId!),
    enabled: !!recipeId,
    retry: false,
  });

  const creatorRecipesQuery = useQuery({
    queryKey: ["recipes", "new-batch", creatorFruit, creatorType],
    queryFn: () =>
      fetchRecipes({
        fruit: creatorFruit!,
        category: creatorType as RecipeCategory,
      }),
    enabled:
      !recipeId &&
      !!creatorFruit &&
      !!creatorType &&
      ["wino", "nalewka", "cydr", "miod"].includes(creatorType),
    staleTime: 60_000,
  });

  const [name, setName] = useState(initialNameFromQuery);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Po pobraniu receptury — prefill nazwy (tylko gdy user nic nie wpisał).
  useEffect(() => {
    if (recipeQuery.data && name === "") {
      setName(recipeQuery.data.name);
    }
    // Świadomie nie listujemy `name` w deps — chcemy prefillować tylko raz,
    // przy pierwszym pojawieniu się danych receptury.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeQuery.data]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let instructionSteps: string[] | undefined;
      if (!recipeId && creatorType && creatorFruit && creatorWaterL && creatorTargetAbv) {
        const type = creatorType as DrinkType;
        const water = Number(creatorWaterL);
        const abv = Number(creatorTargetAbv);
        if (["wino", "nalewka", "cydr", "miod"].includes(type) && Number.isFinite(water) && Number.isFinite(abv)) {
          const { steps } = buildWizardSteps(
            {
              type,
              fruit: creatorFruit,
              waterL: water,
              targetAbv: abv,
            },
            creatorRecipesQuery.data ?? [],
          );
          instructionSteps = steps;
        }
      }
      const created = await createBatch({
        name: name.trim(),
        startDate,
        recipeId: recipeId ?? null,
        instructionSteps,
      });
      // Po sukcesie idziemy prosto do widoku nastawu — bez kodu edycji, bo
      // autoryzacja jest po sesji właściciela.
      navigate(`/nastaw/${created.batch.viewSlug}`, { replace: true });
    } catch (err) {
      if (err instanceof BatchAuthError) {
        // Teoretycznie nie powinno się stać — strona jest pod RequireAuth.
        // Jeśli sesja wygasła w międzyczasie — odeślij na logowanie.
        navigate("/logowanie", { replace: true });
        return;
      }
      const message =
        err instanceof ApiValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Nie udało się założyć nastawu";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(startDate);

  return (
    <>
      <PageHero
        badge="🍷 Nowy nastaw"
        title="Załóż nowy nastaw"
        subtitle="Zapiszemy go na Twoim koncie — wrócisz do niego z każdego urządzenia."
      />
      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-xl space-y-5 px-6">
          {recipeQuery.data && <RecipeSummary recipe={recipeQuery.data} />}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            noValidate
          >
            <div>
              <label
                htmlFor="batch-name"
                className="block text-sm font-medium text-stone-700"
              >
                Nazwa nastawu
              </label>
              <input
                id="batch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder="np. Wino z aronii 2026"
                className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
              />
            </div>

            <div>
              <label
                htmlFor="batch-start"
                className="block text-sm font-medium text-stone-700"
              >
                Data startu
              </label>
              <input
                id="batch-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full rounded-full bg-[var(--color-bordo)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Zakładam…" : "Załóż nastaw"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function RecipeSummary({ recipe }: { recipe: Recipe }) {
  return (
    <article className="rounded-3xl border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-5">
      <h2 className="text-sm uppercase tracking-wide text-[var(--color-bordo)]">
        Z receptury
      </h2>
      <p className="mt-2 text-lg font-semibold text-stone-900">{recipe.name}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-700 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-stone-500">Owoc</dt>
          <dd>{recipe.fruitKg} kg {recipe.fruit}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Cukier</dt>
          <dd>{recipe.sugarKg} kg</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Woda</dt>
          <dd>{recipe.waterL} l</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Drożdże</dt>
          <dd>{recipe.yeastType}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">ABV docelowe</dt>
          <dd>{recipe.targetAbv}%</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Fermentacja</dt>
          <dd>{recipe.fermentationDays} dni</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-stone-600">
        Ta receptura jest bazą wiedzy i zostanie podpięta do nastawu jako punkt
        odniesienia. Pomiary i postęp prowadzisz już osobno dla swojego
        nastawu.
      </p>
    </article>
  );
}
