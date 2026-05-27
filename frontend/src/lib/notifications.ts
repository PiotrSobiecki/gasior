import type { BatchPublic, BatchStage } from "./api";
import { nextActions } from "./nextActions";

// In-app powiadomienia o nadchodzących/zaległych krokach. Liczone czysto
// po stronie frontu z listy nastawów usera — nie wymagają backendowego
// schedulera. Cena: nie zadziałają gdy karta jest zamknięta (in-app only).

export type NotificationUrgency = "overdue" | "today" | "soon";

export type Notification = {
  batchId: string;
  batchName: string;
  viewSlug: string;
  // Następny etap (do którego użytkownik powinien przejść).
  nextStage: BatchStage;
  // Sugerowana akcja, np. „Zlewanie znad osadu".
  actionLabel: string;
  // Ile dni do akcji (0 = dziś, ujemne nie zwracamy — overdue rolujemy do 0
  // i zaznaczamy `overdue: true`).
  etaDays: number;
  overdue: boolean;
  urgency: NotificationUrgency;
};

export const DEFAULT_NOTIFICATION_THRESHOLD_DAYS = 3;

// Bierze listę nastawów + dzisiejszą datę i zwraca wyłącznie te, których
// najbliższa akcja jest zaległa albo wypada w ciągu `thresholdDays` dni.
// Wynik jest posortowany: najpierw zaległe, potem najpilniejsze (etaDays asc),
// a w razie remisu stabilnie po nazwie — żeby UI nie skakał między renderami.
export function pendingNotifications(
  batches: BatchPublic[],
  today: Date,
  thresholdDays: number = DEFAULT_NOTIFICATION_THRESHOLD_DAYS,
): Notification[] {
  const out: Notification[] = [];
  for (const batch of batches) {
    const actions = nextActions({
      stage: batch.stage,
      startDate: batch.startDate,
      today,
    });
    const next = actions.upcoming[0];
    // Brak `upcoming` = nastaw jest w ostatnim etapie (butelkowanie) — nie ma
    // co przypominać, kończysz ręcznie.
    if (!next) continue;
    const withinWindow = !next.overdue && next.etaDays <= thresholdDays;
    if (!next.overdue && !withinWindow) continue;
    out.push({
      batchId: batch.id,
      batchName: batch.name,
      viewSlug: batch.viewSlug,
      nextStage: next.stage,
      actionLabel: next.action,
      etaDays: next.etaDays,
      overdue: next.overdue,
      urgency: next.overdue ? "overdue" : next.etaDays === 0 ? "today" : "soon",
    });
  }

  out.sort((a, b) => {
    // Overdue najpierw (głośniej krzyczą).
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.etaDays !== b.etaDays) return a.etaDays - b.etaDays;
    return a.batchName.localeCompare(b.batchName, "pl");
  });

  return out;
}
