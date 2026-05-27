import { asc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { measurements } from "../db/schema";
import type { Measurement, MeasurementRepo } from "./repo";

type Row = typeof measurements.$inferSelect;

const toMeasurement = (row: Row): Measurement => ({
  id: row.id,
  batchId: row.batchId,
  measuredAt: row.measuredAt.toISOString(),
  brix: row.brix,
  sg: row.sg,
  temperatureC: row.temperatureC,
  note: row.note,
  createdAt: row.createdAt.toISOString(),
});

export function createNeonMeasurementRepo(databaseUrl: string): MeasurementRepo {
  const db = getDb(databaseUrl);
  return {
    async create(input) {
      const [row] = await db
        .insert(measurements)
        .values({
          batchId: input.batchId,
          measuredAt: new Date(input.measuredAt),
          brix: input.brix,
          sg: input.sg,
          temperatureC: input.temperatureC,
          note: input.note,
        })
        .returning();
      return toMeasurement(row);
    },
    async listByBatchId(batchId) {
      const rows = await db
        .select()
        .from(measurements)
        .where(eq(measurements.batchId, batchId))
        .orderBy(asc(measurements.measuredAt));
      return rows.map(toMeasurement);
    },
  };
}
