// Wskaźniki kolejnych czynności dla nastawu — czysty deep module.
// Wyliczamy, ile dni dzieli "dziś" od kolejnego etapu na podstawie:
//   - daty startu nastawu,
//   - obecnego etapu,
//   - długości etapów (z receptury dla burzliwej, dalej domyślne).
//
// Wszystkie wyjścia w dniach (Math.ceil/floor — zaokrąglamy w górę "za 1 dzień").

import type { BatchStage } from "../batches/repo";

export const BATCH_STAGE_ORDER: BatchStage[] = [
  "fermentacja-burzliwa",
  "fermentacja-cicha",
  "dojrzewanie",
  "butelkowanie",
];

// Domyślne ramy czasowe etapów (w dniach). Burzliwa może być nadpisana
// przez `fermentationDays` z receptury.
export const STAGE_DURATIONS_DEFAULT: Record<BatchStage, number> = {
  "fermentacja-burzliwa": 7,
  "fermentacja-cicha": 21,
  dojrzewanie: 60,
  butelkowanie: 0, // ostatni etap — bez "kolejnego"
};

const STAGE_LABELS_PL: Record<BatchStage, string> = {
  "fermentacja-burzliwa": "Fermentacja burzliwa",
  "fermentacja-cicha": "Fermentacja cicha",
  dojrzewanie: "Dojrzewanie",
  butelkowanie: "Butelkowanie",
};

const STAGE_ACTION_LABELS_PL: Record<BatchStage, string> = {
  "fermentacja-burzliwa": "Przelanie na fermentację burzliwą",
  "fermentacja-cicha": "Zlewanie znad osadu",
  dojrzewanie: "Przelanie do dojrzewania",
  butelkowanie: "Butelkowanie",
};

export type UpcomingAction = {
  stage: BatchStage;
  action: string;
  etaDays: number;
  overdue: boolean;
};

export type NextActionsResult = {
  currentStage: BatchStage;
  currentLabel: string;
  upcoming: UpcomingAction[];
};

export type NextActionsInput = {
  stage: BatchStage;
  startDate: string; // YYYY-MM-DD
  today: Date;
  // fermentationDays z receptury — nadpisuje domyślną długość burzliwej.
  fermentationDays?: number;
};

// Liczba dni między dwiema datami (zaokrąglona w górę, ignorująca strefę
// godzinową — używamy UTC daty z YYYY-MM-DD jako "kotwicy").
function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const diffMs = to.getTime() - from.getTime();
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor(diffMs / ms);
}

export function nextActions(input: NextActionsInput): NextActionsResult {
  const { stage, startDate, today, fermentationDays } = input;
  const durations: Record<BatchStage, number> = {
    ...STAGE_DURATIONS_DEFAULT,
    "fermentacja-burzliwa":
      fermentationDays && fermentationDays > 0
        ? fermentationDays
        : STAGE_DURATIONS_DEFAULT["fermentacja-burzliwa"],
  };

  const currentIdx = BATCH_STAGE_ORDER.indexOf(stage);
  const upcoming: UpcomingAction[] = [];

  if (currentIdx >= 0 && currentIdx < BATCH_STAGE_ORDER.length - 1) {
    // ETA do końca obecnego etapu (= początek następnego).
    const daysSinceStart = Math.max(0, daysBetween(startDate, today));
    let runningEnd = durations[stage]; // dni od startu do końca bieżącego etapu

    for (let i = currentIdx + 1; i < BATCH_STAGE_ORDER.length; i++) {
      const nextStage = BATCH_STAGE_ORDER[i];
      const rawEta = runningEnd - daysSinceStart;
      const etaDays = Math.max(0, rawEta);
      upcoming.push({
        stage: nextStage,
        action: STAGE_ACTION_LABELS_PL[nextStage],
        etaDays,
        overdue: rawEta < 0,
      });
      runningEnd += durations[nextStage];
    }
  }

  return {
    currentStage: stage,
    currentLabel: STAGE_LABELS_PL[stage],
    upcoming,
  };
}
