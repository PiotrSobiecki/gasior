import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ApiValidationError,
  createRecipe,
  type CreateRecipeInput,
  type RecipeCategory,
} from "../lib/api";
import { PageHero } from "../components/PageHero";

const CATEGORY_OPTIONS: Array<{ value: RecipeCategory; label: string }> = [
  { value: "wino", label: "Wino" },
  { value: "nalewka", label: "Nalewka" },
  { value: "cydr", label: "Cydr" },
  { value: "miod", label: "Miód pitny" },
];

export function NewRecipe() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateRecipeInput>({
    name: "",
    fruit: "",
    category: "wino",
    fruitKg: 2,
    sugarKg: 1.5,
    waterL: 6,
    yeastType: "drożdże winiarskie",
    targetAbv: 12,
    fermentationDays: 30,
    steps: [""],
    sourceUrls: [""],
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      navigate(`/receptury/${recipe.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiValidationError) {
        setError(err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Nie udało się dodać receptury");
    },
  });

  const setField = <K extends keyof CreateRecipeInput>(key: K, value: CreateRecipeInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setListItem = (
    key: "steps" | "sourceUrls",
    index: number,
    value: string,
  ) => {
    const next = [...form[key]];
    next[index] = value;
    setField(key, next);
  };

  const addListItem = (key: "steps" | "sourceUrls") =>
    setField(key, [...form[key], ""]);

  const removeListItem = (key: "steps" | "sourceUrls", index: number) => {
    const next = form[key].filter((_, i) => i !== index);
    setField(key, next.length > 0 ? next : [""]);
  };

  const canSubmit = form.name.trim() && form.fruit.trim();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CreateRecipeInput = {
      ...form,
      name: form.name.trim(),
      fruit: form.fruit.trim(),
      yeastType: form.yeastType.trim(),
      steps: form.steps.map((s) => s.trim()).filter(Boolean),
      sourceUrls: form.sourceUrls.map((u) => u.trim()).filter(Boolean),
    };

    mutation.mutate(payload);
  }

  return (
    <>
      <PageHero
        badge="🧪 Nowa receptura"
        title="Dodaj własną recepturę"
        subtitle="Zapisz swój przepis jako szkic — po walidacji możesz go dopracować."
      />
      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-3xl px-6">
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nazwa receptury">
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                  required
                />
              </Field>
              <Field label="Owoc">
                <input
                  value={form.fruit}
                  onChange={(e) => setField("fruit", e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                  required
                />
              </Field>
              <Field label="Kategoria">
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value as RecipeCategory)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Drożdże / typ">
                <input
                  value={form.yeastType}
                  onChange={(e) => setField("yeastType", e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
              <Field label="Owoce (kg)">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.fruitKg}
                  onChange={(e) => setField("fruitKg", Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
              <Field label="Cukier (kg)">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.sugarKg}
                  onChange={(e) => setField("sugarKg", Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
              <Field label="Woda (l)">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.waterL}
                  onChange={(e) => setField("waterL", Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
              <Field label="Docelowe ABV (%)">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={70}
                  value={form.targetAbv}
                  onChange={(e) => setField("targetAbv", Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
              <Field label="Fermentacja (dni)">
                <input
                  type="number"
                  min={1}
                  value={form.fermentationDays}
                  onChange={(e) => setField("fermentationDays", Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </Field>
            </div>

            <ListEditor
              title="Kroki"
              values={form.steps}
              onChange={(idx, value) => setListItem("steps", idx, value)}
              onAdd={() => addListItem("steps")}
              onRemove={(idx) => removeListItem("steps", idx)}
              placeholder="np. Zdezynfekuj sprzęt"
            />

            <ListEditor
              title="Źródła (URL)"
              values={form.sourceUrls}
              onChange={(idx, value) => setListItem("sourceUrls", idx, value)}
              onAdd={() => addListItem("sourceUrls")}
              onRemove={(idx) => removeListItem("sourceUrls", idx)}
              placeholder="https://..."
            />

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit || mutation.isPending}
                className="rounded-full bg-[var(--color-bordo)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Zapisuję…" : "Dodaj recepturę"}
              </button>
              <Link
                to="/receptury"
                className="rounded-full border border-stone-300 px-5 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
              >
                Wróć do listy
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

function ListEditor({
  title,
  values,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-700">{title}</p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
        >
          + Dodaj
        </button>
      </div>
      {values.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(idx, e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-bordo)]/60"
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="rounded-full border border-stone-300 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
            >
              Usuń
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
