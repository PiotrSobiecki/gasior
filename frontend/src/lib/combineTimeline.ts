import type { Measurement, JournalEntry } from "./api";

// Pojedyncze zdarzenie na osi czasu nastawu — pomiar lub wpis dziennika.
// Pole `at` to ujednolicony timestamp (ISO), żeby UI mógł sortować i grupować
// bez znajomości pól wewnętrznych.
export type TimelineEvent =
  | { kind: "measurement"; at: string; measurement: Measurement }
  | { kind: "journal"; at: string; entry: JournalEntry };

// Łączy pomiary i wpisy dziennika w jedną listę posortowaną chronologicznie
// asc po `at`. Przy identycznych timestampach pomiar jest przed wpisem
// (stabilność: wartość liczbowa danych przed komentarzem).
export function combineTimeline(
  measurements: Measurement[],
  journal: JournalEntry[],
): TimelineEvent[] {
  const fromMeasurements: TimelineEvent[] = measurements.map((m) => ({
    kind: "measurement",
    at: m.measuredAt,
    measurement: m,
  }));
  const fromJournal: TimelineEvent[] = journal.map((e) => ({
    kind: "journal",
    at: e.entryAt,
    entry: e,
  }));

  const all = [...fromMeasurements, ...fromJournal];
  all.sort((a, b) => {
    const c = a.at.localeCompare(b.at);
    if (c !== 0) return c;
    // Tie-break: measurement przed journal.
    if (a.kind === b.kind) return 0;
    return a.kind === "measurement" ? -1 : 1;
  });
  return all;
}
