import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BatchAuthError,
  BATCH_STAGE_LABELS,
  BATCH_STAGES,
  createJournalEntry,
  createMeasurement,
  fetchBatch,
  fetchJournal,
  fetchMeasurements,
  fetchRecipe,
  updateBatch,
  type BatchPublic,
  type BatchStage,
  type JournalEntry,
  type Measurement,
  type Recipe,
} from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { nextActions, type NextActionsResult } from "../lib/nextActions";
import { daysSinceStart, formatDaysSince } from "../lib/batchTimeline";
import { computeActualAbv } from "../lib/abvFromMeasurements";
import { combineTimeline, type TimelineEvent } from "../lib/combineTimeline";
import { HelpHint } from "../components/HelpHint";
import { BatchInstructionChecklist } from "../components/BatchInstructionChecklist";
import { GasiorStageImage } from "../components/GasiorStageImage";
import { validatePhoto, MAX_PHOTO_BYTES } from "../lib/photoValidation";
import { PageHero } from "../components/PageHero";
import { loadTemplateSteps } from "../lib/batchTemplateSteps";
import { loadCheckedStepIndices } from "../lib/batchStepProgress";

export function BatchView() {
  const { viewSlug } = useParams<{ viewSlug: string }>();
  const slug = viewSlug ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["batch", slug],
    queryFn: () => fetchBatch(slug),
    retry: false,
    enabled: !!slug,
  });

  if (isLoading) return <BatchSkeleton />;
  if (isError) {
    const msg = error instanceof Error ? error.message : "Błąd";
    return (
      <>
        <PageHero badge="🍷 Nastaw" title="Nie znaleziono nastawu" />
        <section className="bg-[var(--color-cream)] py-16">
          <div className="mx-auto max-w-2xl px-6 text-stone-600">{msg}</div>
        </section>
      </>
    );
  }
  if (!data) return null;

  return <BatchLoaded batch={data} />;
}

function BatchLoaded({ batch }: { batch: BatchPublic }) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // Edytować mogą: właściciel (po sesji) lub każdy w trybie demo.
  const isOwner = !!currentUser && currentUser.id === batch.userId;
  const canEdit = batch.isDemo || isOwner;

  const [stage, setStage] = useState<BatchStage>(batch.stage);
  const [startDate, setStartDate] = useState(batch.startDate);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  // Trzymaj formularz w sync z świeżymi danymi serwera (np. po refetch).
  useEffect(() => {
    setStage(batch.stage);
    setStartDate(batch.startDate);
  }, [batch.stage, batch.startDate]);

  const { data: measurements = [] } = useQuery({
    queryKey: ["batch", batch.viewSlug, "measurements"],
    queryFn: () => fetchMeasurements(batch.viewSlug),
  });
  const { data: journal = [] } = useQuery({
    queryKey: ["batch", batch.viewSlug, "journal"],
    queryFn: () => fetchJournal(batch.viewSlug),
  });
  const { data: recipe } = useQuery({
    queryKey: ["recipe", batch.recipeId],
    queryFn: () => fetchRecipe(batch.recipeId!),
    enabled: !!batch.recipeId,
    retry: false,
  });
  const instructionSteps =
    batch.instructionSteps.length > 0
      ? batch.instructionSteps
      : recipe?.steps.length
        ? recipe.steps
        : loadTemplateSteps(batch.id);

  const checkedStepIndices =
    batch.checkedStepIndices.length > 0 || batch.instructionSteps.length > 0
      ? batch.checkedStepIndices
      : [...loadCheckedStepIndices(batch.id)];

  const realAbv = computeActualAbv(measurements);
  const timeline = combineTimeline(measurements, journal);
  const actions = nextActions({
    stage: batch.stage,
    startDate: batch.startDate,
    today: new Date(),
    fermentationDays: recipe?.fermentationDays,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new BatchAuthError(401);
      return updateBatch(batch.viewSlug, { stage, startDate });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["batch", batch.viewSlug], updated);
      setFeedback({ kind: "ok", text: "Zapisano." });
    },
    onError: (err) => {
      if (err instanceof BatchAuthError) {
        setFeedback({
          kind: "error",
          text:
            err.status === 401
              ? "Musisz się zalogować, by edytować nastaw."
              : "Nie masz uprawnień do tego nastawu.",
        });
        return;
      }
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Błąd zapisu",
      });
    },
  });

  const checklistMutation = useMutation({
    mutationFn: async (indices: number[]) => {
      if (!canEdit) throw new BatchAuthError(401);
      return updateBatch(batch.viewSlug, { checkedStepIndices: indices });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["batch", batch.viewSlug], updated);
    },
  });

  async function saveCheckedSteps(indices: number[]) {
    await checklistMutation.mutateAsync(indices);
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    mutation.mutate();
  };

  const daysSince = daysSinceStart(batch.startDate);

  return (
    <>
      <PageHero
        badge="🍷 Nastaw"
        title={batch.name}
        subtitle={`Start: ${batch.startDate} (${formatDaysSince(daysSince)})`}
      />

      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-2xl space-y-6 px-6">
          <article className="rounded-3xl border border-stone-200 bg-[#F0EDD9] p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <GasiorStageImage stage={batch.stage} size="md" className="shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-sm uppercase tracking-wide text-stone-400">
                    Bieżący etap
                  </h2>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-bordo)]">
                    {BATCH_STAGE_LABELS[batch.stage]}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Data startu:{" "}
                    <span className="font-mono">{batch.startDate}</span>
                  </p>
                </div>
              </div>
              {realAbv !== null && (
                <div className="rounded-2xl border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    Realne ABV
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-bordo)]">
                    {realAbv.toFixed(1)} %
                  </p>
                </div>
              )}
            </div>
          </article>

          {batch.isDemo && <DemoBanner />}

          {recipe && (
            <RecipeReferenceSection
              recipe={recipe}
              instructionSteps={instructionSteps}
              checkedStepIndices={checkedStepIndices}
              canEdit={canEdit}
              onCheckedChange={saveCheckedSteps}
            />
          )}
          {!recipe && instructionSteps.length > 0 && (
            <BatchInstructionChecklist
              title="Instrukcja z kreatora"
              subtitle={batch.name}
              steps={instructionSteps}
              checkedStepIndices={checkedStepIndices}
              canEdit={canEdit}
              onCheckedChange={saveCheckedSteps}
            />
          )}

          {actions.upcoming.length > 0 && <NextActionsCard actions={actions} />}

          <Timeline events={timeline} />

          {canEdit && (
            <>
              <AddMeasurementForm viewSlug={batch.viewSlug} />
              <AddJournalEntryForm viewSlug={batch.viewSlug} />
            </>
          )}

          {canEdit ? (
            <form
              onSubmit={onSubmit}
              className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">
                  {batch.isDemo
                    ? "Edycja (tryb pokazowy)"
                    : "Edycja — etap i data"}
                </h3>
              </div>

              <div>
                <label
                  htmlFor="batch-stage"
                  className="block text-sm font-medium text-stone-700"
                >
                  Etap
                </label>
                <select
                  id="batch-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as BatchStage)}
                  disabled={mutation.isPending}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                >
                  {BATCH_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {BATCH_STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="batch-startDate"
                  className="block text-sm font-medium text-stone-700"
                >
                  Data startu
                </label>
                <input
                  id="batch-startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
                />
              </div>

              {feedback && (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    feedback.kind === "ok"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {feedback.text}
                </p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-full bg-[var(--color-bordo)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Zapisuję…" : "Zapisz zmiany"}
              </button>
            </form>
          ) : (
            <ViewOnlyNotice isLoggedIn={!!currentUser} />
          )}
        </div>
      </section>
    </>
  );
}

// Stopka informująca, dlaczego user widzi nastaw tylko do podglądu:
// - gość → namawiamy do zalogowania / rejestracji;
// - zalogowany, ale nie właściciel → tłumaczymy, że edycja jest tylko po stronie autora.
function ViewOnlyNotice({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (!isLoggedIn) {
    return (
      <aside className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-700 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-800">
          Tylko podgląd
        </h3>
        <p className="mt-2">
          Aby edytować nastawy i prowadzić własny dziennik —{" "}
          <Link
            to="/logowanie"
            className="font-medium text-[var(--color-bordo)] hover:underline"
          >
            zaloguj się
          </Link>{" "}
          lub{" "}
          <Link
            to="/rejestracja"
            className="font-medium text-[var(--color-bordo)] hover:underline"
          >
            załóż konto
          </Link>
          .
        </p>
      </aside>
    );
  }
  return (
    <aside className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-700 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-800">
        Tylko podgląd
      </h3>
      <p className="mt-2">
        Ten nastaw należy do innego użytkownika — możesz go obejrzeć, ale tylko
        autor może go edytować. Jeśli to Twój nastaw, sprawdź na jakim koncie
        jesteś zalogowany.
      </p>
    </aside>
  );
}

function BatchSkeleton() {
  return (
    <>
      <PageHero badge="🍷 Nastaw" title="Wczytywanie…" />
      <section className="bg-[var(--color-cream)] py-16">
        <div className="mx-auto max-w-2xl space-y-4 px-6">
          <div className="h-32 animate-pulse rounded-3xl border border-stone-200 bg-white/70" />
          <div className="h-64 animate-pulse rounded-3xl border border-stone-200 bg-white/70" />
        </div>
      </section>
    </>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <article className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-700">Oś czasu</h3>
        <p className="mt-2">
          Jeszcze brak danych. Dodaj pierwszy pomiar (Blg lub SG) albo wpis
          dziennika, by zacząć śledzić nastaw.
        </p>
      </article>
    );
  }

  const measurementCount = events.filter((e) => e.kind === "measurement").length;
  const journalCount = events.length - measurementCount;

  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-700">
        Oś czasu — pomiary: {measurementCount}, wpisy: {journalCount}
      </h3>
      <ol className="mt-4 space-y-3">
        {events.map((e) =>
          e.kind === "measurement" ? (
            <MeasurementRow key={`m-${e.measurement.id}`} m={e.measurement} />
          ) : (
            <JournalRow key={`j-${e.entry.id}`} e={e.entry} />
          ),
        )}
      </ol>
    </article>
  );
}

function MeasurementRow({ m }: { m: Measurement }) {
  return (
    <li
      data-testid="timeline-event"
      data-kind="measurement"
      className="flex flex-col gap-1 rounded-2xl border-l-4 border-[var(--color-amber)]/60 bg-stone-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4"
    >
      <span className="font-mono text-xs text-stone-500 sm:w-44">
        {formatMeasuredAt(m.measuredAt)}
      </span>
      <span
        data-testid="measurement-row"
        className="flex flex-wrap items-center gap-3 text-stone-800"
      >
        {m.sg != null && (
          <span>
            SG <span className="font-semibold">{m.sg.toFixed(3)}</span>
          </span>
        )}
        {m.brix != null && (
          <span>
            Blg <span className="font-semibold">{m.brix.toFixed(1)}</span>
          </span>
        )}
        {m.temperatureC != null && (
          <span className="text-stone-500">
            {m.temperatureC.toFixed(1)} °C
          </span>
        )}
      </span>
      {m.note && (
        <span className="text-stone-600 sm:flex-1 sm:text-right">{m.note}</span>
      )}
    </li>
  );
}

function JournalRow({ e }: { e: JournalEntry }) {
  return (
    <li
      data-testid="timeline-event"
      data-kind="journal"
      className="flex flex-col gap-2 rounded-2xl border-l-4 border-[var(--color-bordo)]/60 bg-stone-50 px-4 py-3 text-sm"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-stone-500">
          {formatMeasuredAt(e.entryAt)}
        </span>
        <span className="text-xs uppercase tracking-wide text-[var(--color-bordo)]/80">
          dziennik
        </span>
      </div>
      <p className="whitespace-pre-line text-stone-800">{e.body}</p>
      {e.photoUrl && (
        <img
          src={e.photoUrl}
          alt={`Zdjęcie wpisu z ${formatMeasuredAt(e.entryAt)}`}
          loading="lazy"
          className="mt-1 max-h-72 w-full rounded-xl object-cover"
        />
      )}
    </li>
  );
}

function formatMeasuredAt(iso: string): string {
  // np. "2026-05-20 08:00"
  return iso.replace("T", " ").slice(0, 16);
}

function AddMeasurementForm({ viewSlug }: { viewSlug: string }) {
  const queryClient = useQueryClient();
  const [measuredAt, setMeasuredAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [sg, setSg] = useState("");
  const [brix, setBrix] = useState("");
  const [tempC, setTempC] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const sgNum = sg.trim() ? Number(sg) : null;
      const brixNum = brix.trim() ? Number(brix) : null;
      if (sgNum == null && brixNum == null) {
        throw new Error("Podaj SG lub Blg");
      }
      return createMeasurement(viewSlug, {
        // input type="datetime-local" daje "YYYY-MM-DDTHH:mm"; dorzucamy strefę
        measuredAt: new Date(measuredAt).toISOString(),
        sg: sgNum,
        brix: brixNum,
        temperatureC: tempC.trim() ? Number(tempC) : null,
        note: note.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["batch", viewSlug, "measurements"],
      });
      setSg("");
      setBrix("");
      setTempC("");
      setNote("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Błąd zapisu pomiaru");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sg.trim() && !brix.trim()) {
      setError("Podaj SG lub Blg");
      return;
    }
    mutation.mutate();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <h3 className="text-sm font-semibold text-stone-700">Dodaj pomiar</h3>

      <div>
        <label
          htmlFor="m-when"
          className="block text-sm font-medium text-stone-700"
        >
          Data i godzina pomiaru
        </label>
        <input
          id="m-when"
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <div className="flex items-center">
            <label
              htmlFor="m-sg"
              className="block text-sm font-medium text-stone-700"
            >
              SG (gęstość)
            </label>
            <HelpHint>
              <strong className="block font-semibold text-stone-800">
                Specific Gravity — gęstość względna.
              </strong>
              Mierzysz areometrem (cukromierzem) w probówce z brzeczką. Woda ma
              SG = 1.000. Brzeczka winna na starcie to zwykle 1.080–1.100, a po
              fermentacji wytrawnej spada do 0.990–1.000.
              <span className="mt-1 block text-stone-500">
                Spadek o ~17 punktów SG ≈ 1% ABV.
              </span>
            </HelpHint>
          </div>
          <input
            id="m-sg"
            type="number"
            step="0.001"
            min={0.9}
            max={1.5}
            placeholder="np. 1.045"
            value={sg}
            onChange={(e) => setSg(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
          />
        </div>
        <div>
          <div className="flex items-center">
            <label
              htmlFor="m-brix"
              className="block text-sm font-medium text-stone-700"
            >
              Blg / Brix
            </label>
            <HelpHint>
              <strong className="block font-semibold text-stone-800">
                Procent ekstraktu (cukru) w brzeczce.
              </strong>
              Mierzysz refraktometrem — kropla soku/moszczu na pryzmat. 1 °Brix
              ≈ 1 g cukru w 100 g brzeczki. Typowy moszcz winny: 20–25 °Brix;
              cydr 12–16; piwo 11–14.
              <span className="mt-1 block text-stone-500">
                Uwaga: po starcie fermentacji refraktometr zaniża wskazania o
                ~25% (alkohol załamuje światło inaczej). Wtedy przesiądź się na
                areometr (SG) albo użyj korekty.
              </span>
            </HelpHint>
          </div>
          <input
            id="m-brix"
            type="number"
            step="0.1"
            min={0}
            max={50}
            placeholder="np. 12"
            value={brix}
            onChange={(e) => setBrix(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
          />
        </div>
        <div>
          <div className="flex items-center">
            <label
              htmlFor="m-temp"
              className="block text-sm font-medium text-stone-700"
            >
              Temp. (°C)
            </label>
            <HelpHint>
              <strong className="block font-semibold text-stone-800">
                Temperatura brzeczki w momencie pomiaru.
              </strong>
              Areometr jest kalibrowany na konkretną temperaturę (najczęściej
              20 °C). Im dalej od niej, tym większy błąd odczytu SG.
              <span className="mt-1 block text-stone-500">
                Wpisz temperaturę, żebyśmy mogli ją zapisać razem z odczytem
                (i ewentualnie później skorygować).
              </span>
            </HelpHint>
          </div>
          <input
            id="m-temp"
            type="number"
            step="0.1"
            min={-10}
            max={60}
            placeholder="np. 21"
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="m-note"
          className="block text-sm font-medium text-stone-700"
        >
          Notatka (opcjonalna)
        </label>
        <input
          id="m-note"
          type="text"
          maxLength={500}
          placeholder="np. start, klarowanie, butelkowanie…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full bg-[var(--color-bordo)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? "Zapisuję pomiar…" : "Dodaj pomiar"}
      </button>
    </form>
  );
}

function AddJournalEntryForm({ viewSlug }: { viewSlug: string }) {
  const queryClient = useQueryClient();
  const [entryAt, setEntryAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [body, setBody] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (text.length === 0) throw new Error("Treść wpisu jest wymagana");

      // Wczesna walidacja zdjęcia po stronie klienta — backend i tak sprawdzi.
      if (photoFile) {
        const v = validatePhoto({
          contentType: photoFile.type,
          sizeBytes: photoFile.size,
        });
        if (!v.ok) throw new Error(v.reason);
      }

      return createJournalEntry(viewSlug, {
        entryAt: new Date(entryAt).toISOString(),
        body: text,
        photo: photoFile,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["batch", viewSlug, "journal"],
      });
      setBody("");
      setPhotoFile(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Błąd zapisu wpisu");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Treść wpisu jest wymagana");
      return;
    }
    mutation.mutate();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <h3 className="text-sm font-semibold text-stone-700">
        Dodaj wpis do dziennika
      </h3>

      <div>
        <label
          htmlFor="j-when"
          className="block text-sm font-medium text-stone-700"
        >
          Data i godzina wpisu
        </label>
        <input
          id="j-when"
          type="datetime-local"
          value={entryAt}
          onChange={(e) => setEntryAt(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
        />
      </div>

      <div>
        <label
          htmlFor="j-body"
          className="block text-sm font-medium text-stone-700"
        >
          Treść wpisu
        </label>
        <textarea
          id="j-body"
          rows={4}
          maxLength={5000}
          placeholder="np. zapach owocowy, klaruje się, smakuje wytrawnie…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--color-bordo)]/60"
        />
      </div>

      <div>
        <label
          htmlFor="j-photo"
          className="block text-sm font-medium text-stone-700"
        >
          Zdjęcie (opcjonalne, max {(MAX_PHOTO_BYTES / 1024 / 1024).toFixed(0)} MB)
        </label>
        <input
          id="j-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-stone-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-700 hover:file:bg-stone-300"
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full bg-[var(--color-bordo)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? "Zapisuję wpis…" : "Dodaj wpis"}
      </button>
    </form>
  );
}

function DemoBanner() {
  return (
    <aside
      role="status"
      aria-live="polite"
      data-testid="demo-banner"
      className="rounded-3xl border-2 border-dashed border-[var(--color-amber)] bg-[var(--color-amber)]/15 p-5 text-stone-800"
    >
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-bordo)]">
        <span aria-hidden>🎬</span> Tryb pokazowy
      </p>
      <p className="mt-2 text-sm text-stone-700">
        To publiczny nastaw demo — każdy może edytować etap, dodawać pomiary
        i wpisy bez logowania. Świetne miejsce, żeby zobaczyć, jak działa
        tracker zanim założysz własny nastaw.
      </p>
    </aside>
  );
}

function NextActionsCard({ actions }: { actions: NextActionsResult }) {
  return (
    <article
      aria-labelledby="next-actions-title"
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="next-actions-title"
        className="text-sm font-medium uppercase tracking-wide text-stone-400"
      >
        Następne czynności
      </h2>
      <p className="mt-2 text-stone-700">
        Aktualnie:{" "}
        <span className="font-semibold text-stone-900">
          {actions.currentLabel}
        </span>
      </p>
      <ul className="mt-4 space-y-3">
        {actions.upcoming.map((a) => (
          <li
            key={a.stage}
            className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-[#F0EDD9] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <GasiorStageImage stage={a.stage} size="sm" />
              <div>
                <p className="text-sm font-medium text-stone-800">{a.action}</p>
                <p className="text-xs text-stone-500">
                  {BATCH_STAGE_LABELS[a.stage]}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                a.overdue
                  ? "bg-red-100 text-red-800"
                  : a.etaDays <= 1
                    ? "bg-amber-100 text-amber-900"
                    : "bg-stone-200 text-stone-700"
              }`}
            >
              {a.overdue
                ? "Pora już teraz"
                : a.etaDays === 0
                  ? "Dziś"
                  : `Za ${a.etaDays} ${a.etaDays === 1 ? "dzień" : "dni"}`}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function RecipeReferenceSection({
  recipe,
  instructionSteps,
  checkedStepIndices,
  canEdit,
  onCheckedChange,
}: {
  recipe: Recipe;
  instructionSteps: string[];
  checkedStepIndices: number[];
  canEdit: boolean;
  onCheckedChange: (indices: number[]) => void | Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <article
        aria-labelledby="from-recipe-title"
        className="rounded-3xl border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-6"
      >
        <h2
          id="from-recipe-title"
          className="text-sm font-medium uppercase tracking-wide text-[var(--color-bordo)]"
        >
          Proporcje z receptury (baza wiedzy)
        </h2>
        <p className="mt-2 text-lg font-semibold text-stone-900">{recipe.name}</p>
        <p className="mt-2 text-sm text-stone-600">
          To punkt odniesienia z bazy receptur — nie nadpisuje automatycznie
          Twojego nastawu. Pomiary i dziennik zapisujesz osobno poniżej.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-stone-700 sm:grid-cols-3">
          <Field label="Owoce" value={`${recipe.fruitKg} kg ${recipe.fruit}`} />
          <Field label="Cukier" value={`${recipe.sugarKg} kg`} />
          <Field label="Woda" value={`${recipe.waterL} l`} />
          <Field label="Drożdże" value={recipe.yeastType} />
          <Field label="ABV docelowe" value={`${recipe.targetAbv}%`} />
          <Field label="Fermentacja" value={`${recipe.fermentationDays} dni`} />
        </dl>
      </article>

      {instructionSteps.length > 0 && (
        <BatchInstructionChecklist
          title="Instrukcja krok po kroku"
          subtitle={recipe.name}
          steps={instructionSteps}
          checkedStepIndices={checkedStepIndices}
          canEdit={canEdit}
          onCheckedChange={onCheckedChange}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
