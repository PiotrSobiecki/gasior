import { z } from "zod";

// Pełny ISO 8601 z "T" — proste sprawdzenie, że to data + godzina.
const isoTimestamp = z
  .string()
  .refine((s) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return false;
    const d = new Date(s);
    return Number.isFinite(d.getTime());
  }, "Niepoprawna data pomiaru (oczekiwany ISO 8601)");

// Akceptujemy tylko realistyczne odczyty — odrzucamy nonsensowne wartości
// już na wejściu, żeby serwis nie musiał ich rozważać.
const brix = z.number().min(0).max(50);
const sg = z.number().min(0.9).max(1.5);
const temperature = z.number().min(-10).max(60);
const note = z.string().trim().max(500);

export const createMeasurementBodySchema = z.object({
  measuredAt: isoTimestamp,
  brix: brix.optional().nullable(),
  sg: sg.optional().nullable(),
  temperatureC: temperature.optional().nullable(),
  note: note.optional().nullable(),
});

export type CreateMeasurementBody = z.infer<typeof createMeasurementBodySchema>;
