import type { Measurement, MeasurementInput, MeasurementRepo } from "./repo";

// In-memory implementacja MeasurementRepo — test double i dev sandbox.
export function createInMemoryMeasurementRepo(
  initial: Measurement[] = [],
): MeasurementRepo {
  const measurements = [...initial];
  return {
    async create(input: MeasurementInput) {
      const m: Measurement = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      measurements.push(m);
      return m;
    },
    async listByBatchId(batchId) {
      return measurements
        .filter((m) => m.batchId === batchId)
        .slice()
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
    },
  };
}
