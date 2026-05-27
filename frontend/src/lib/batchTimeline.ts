// Pomocniki do prezentacji czasu nastawu w UI.
// Czyste, deterministyczne — godzina liczona w UTC, żeby uniknąć
// efektów DST i lokalnej strefy w teście/SSR.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function atUtcDay(iso: string): number {
  // "YYYY-MM-DD" → epoch 00:00:00Z
  return new Date(`${iso}T00:00:00Z`).getTime();
}

export function daysSinceStart(startDateIso: string, now: Date = new Date()): number {
  const nowUtcDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startMs = atUtcDay(startDateIso);
  return Math.round((nowUtcDay - startMs) / MS_PER_DAY);
}

// Polska odmiana liczebnika — uproszczona, wystarczająca dla "dzień/dni".
export function formatDaysSince(days: number): string {
  if (days === 0) return "dziś";
  const abs = Math.abs(days);
  const unit = abs === 1 ? "dzień" : "dni";
  return days > 0 ? `${abs} ${unit}` : `za ${abs} ${unit}`;
}
