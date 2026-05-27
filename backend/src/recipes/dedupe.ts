import type { Recipe } from "./repo";

// Klucz duplikatu — dwie receptury są duplikatem gdy mają identyczne wszystkie
// "treściowe" pola: nazwę (po normalizacji), kategorię, owoc i komplet liczb.
// Świadomie pomijamy `steps`, `sourceUrls` i `status` — nie chcemy, by lekko
// inny opis kroków lub adnotacja walidacji blokowały deduplikację.
function dupKey(r: Recipe): string {
  return JSON.stringify({
    name: r.name.toLowerCase().trim(),
    fruit: r.fruit.toLowerCase().trim(),
    category: r.category,
    fruitKg: r.fruitKg,
    sugarKg: r.sugarKg,
    waterL: r.waterL,
    targetAbv: r.targetAbv,
    fermentationDays: r.fermentationDays,
    yeastType: r.yeastType.toLowerCase().trim(),
  });
}

export type DedupePlan = {
  // Grupy duplikatów; w każdej >=2 receptury.
  groups: Array<{
    key: string;
    keep: Recipe;
    drop: Recipe[];
  }>;
  // Łączna liczba receptur do skasowania.
  toDeleteCount: number;
};

// Decyzja "którego zostawić" w grupie:
//   1) `validated` ma pierwszeństwo nad `draft`;
//   2) przy remisie — najstarsza receptura po `createdAt` (najpewniej oryginał);
//   3) ostateczny tie-break: leksykograficznie po `id` (stabilność testów).
function pickKeeper(group: Recipe[]): Recipe {
  return [...group].sort((a, b) => {
    if (a.status !== b.status) return a.status === "validated" ? -1 : 1;
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (ta !== tb) return ta - tb;
    return a.id < b.id ? -1 : 1;
  })[0];
}

// Buduje plan deduplikacji bez efektów ubocznych. Wywołujący decyduje, czy
// faktycznie usuwa rekordy (dry-run vs apply).
export function planDedupe(recipes: Recipe[]): DedupePlan {
  const buckets = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const k = dupKey(r);
    const list = buckets.get(k);
    if (list) list.push(r);
    else buckets.set(k, [r]);
  }

  const groups: DedupePlan["groups"] = [];
  let toDeleteCount = 0;
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const keep = pickKeeper(list);
    const drop = list.filter((r) => r.id !== keep.id);
    groups.push({ key, keep, drop });
    toDeleteCount += drop.length;
  }
  return { groups, toDeleteCount };
}
