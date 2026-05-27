import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DRINK_TYPES, type DrinkType } from "../../../lib/calc";
import { fruitWithGenitive } from "../../../lib/fruits";
import { fetchRecipes } from "../../../lib/api";
import { buildAlignedPlan } from "../../../lib/recipeAlignment";

export function ResultStep({
  type,
  fruit,
  waterL,
  targetAbv,
  onRestart,
}: {
  type: DrinkType;
  fruit: string;
  waterL: number;
  targetAbv: number;
  onRestart: () => void;
}) {
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes", "wizard", fruit, type],
    queryFn: () => fetchRecipes({ fruit, category: type }),
    staleTime: 60_000,
  });

  const plan = buildAlignedPlan(type, fruit, waterL, targetAbv, recipes);
  const cfg = DRINK_TYPES[type];
  const maceration = plan.method === "maceracja";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-2xl px-4 py-8"
    >
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-leaf)]">
          Twój plan z kreatora ({maceration ? "maceracja" : "fermentacja"})
        </p>
        <h2 className="mt-1 text-3xl font-bold text-stone-900">
          {cfg.emoji} {cfg.label} {fruitWithGenitive(fruit)}
        </h2>
        <p className="mt-1 text-stone-500">
          {waterL} l · ok. {targetAbv}% ABV · {plan.method}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {plan.fruitKg !== undefined && plan.fruitKg > 0 && (
            <Metric label="Owoce (szac.)" value={`${plan.fruitKg} kg`} big />
          )}
          <Metric label="Cukier" value={`${plan.sugarKg} kg`} big />
          {maceration ? (
            <Metric label="Spirytus" value={`${plan.spiritL} l`} big />
          ) : (
            <Metric label="Woda / sok" value={`${plan.waterL} l`} big />
          )}
          <Metric label="Szac. ABV" value={`${plan.targetAbv}%`} big />
          {maceration ? (
            <>
              <Metric label="Baza" value={plan.spiritType ?? ""} />
              <Metric label="Objętość" value={`${plan.waterL} l`} />
              <Metric label="Maceracja" value={`~${plan.fermentationDays} dni`} />
            </>
          ) : (
            <>
              <Metric label="Drożdże" value={plan.yeastType ?? ""} />
              <Metric label="Czas" value={`~${plan.fermentationDays} dni`} />
            </>
          )}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/nastawy/nowy?name=${encodeURIComponent(`${cfg.label} ${fruitWithGenitive(fruit)}`)}&type=${encodeURIComponent(type)}&fruit=${encodeURIComponent(fruit)}&waterL=${encodeURIComponent(String(waterL))}&targetAbv=${encodeURIComponent(String(targetAbv))}`}
            className="rounded-xl bg-[var(--color-amber)] px-6 py-3 font-semibold text-[#2a160a] shadow transition hover:brightness-105 active:scale-95"
          >
            Załóż nastaw z tych wyliczeń →
          </Link>
          <Link
            to={`/receptury?fruit=${encodeURIComponent(fruit)}`}
            className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Sprawdź bazę receptur →
          </Link>
          <button
            onClick={onRestart}
            className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Policz od nowa
          </button>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          {plan.alignedFromRecipes ? (
            <>
              Proporcje dopasowane do podobnych receptur w bazie (
              {plan.referenceRecipeNames.join(", ")}), skorygowane wzorem cukru →
              ABV.
            </>
          ) : maceration ? (
            "Brak podobnej receptury w bazie — wyliczenia tylko ze wzoru. Nalewka na spirytusie spożywczym, bez destylacji."
          ) : (
            "Brak podobnej receptury w bazie — wyliczenia ze wzoru (~17 g cukru/l ≈ 1% ABV)."
          )}
        </p>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div>
      <dt className="text-sm text-stone-400">{label}</dt>
      <dd
        className={`font-semibold text-stone-900 ${big ? "text-2xl" : "text-base"}`}
      >
        {value}
      </dd>
    </div>
  );
}
