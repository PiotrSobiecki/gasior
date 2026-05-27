import type { BatchRepo } from "../batches/repo";
import type { Measurement, MeasurementRepo } from "./repo";

export type AddMeasurementInput = {
  measuredAt: string;
  brix: number | null;
  sg: number | null;
  temperatureC: number | null;
  note: string | null;
};

export type AddMeasurementResult =
  | { ok: true; measurement: Measurement }
  | {
      ok: false;
      reason: "not-found" | "auth-required" | "forbidden" | "invalid";
    };

export type MeasurementServiceDeps = {
  batchRepo: BatchRepo;
  measurementRepo: MeasurementRepo;
};

export interface MeasurementService {
  // actorUserId === undefined → niezalogowany → auth-required dla nie-demo.
  addMeasurement(
    viewSlug: string,
    actorUserId: string | undefined,
    input: AddMeasurementInput,
  ): Promise<AddMeasurementResult>;
  // Lista pomiarów po viewSlug. Publiczna — nie wymaga sesji.
  // Zwraca null gdy slug nieistniejący (żeby HTTP mógł dać 404).
  list(viewSlug: string): Promise<Measurement[] | null>;
}

export function createMeasurementService(
  deps: MeasurementServiceDeps,
): MeasurementService {
  return {
    async addMeasurement(viewSlug, actorUserId, input) {
      const batch = await deps.batchRepo.getByViewSlug(viewSlug);
      if (!batch) return { ok: false, reason: "not-found" };

      if (!batch.isDemo) {
        if (actorUserId === undefined) {
          return { ok: false, reason: "auth-required" };
        }
        if (actorUserId !== batch.userId) {
          return { ok: false, reason: "forbidden" };
        }
      }

      // Co najmniej jeden odczyt gęstości jest wymagany — kalkulator ABV
      // potrzebuje SG lub Blg. Sama temperatura/notatka to nie pomiar.
      if (input.brix == null && input.sg == null) {
        return { ok: false, reason: "invalid" };
      }

      const measurement = await deps.measurementRepo.create({
        batchId: batch.id,
        measuredAt: input.measuredAt,
        brix: input.brix,
        sg: input.sg,
        temperatureC: input.temperatureC,
        note: input.note,
      });
      return { ok: true, measurement };
    },

    async list(viewSlug) {
      const batch = await deps.batchRepo.getByViewSlug(viewSlug);
      if (!batch) return null;
      return deps.measurementRepo.listByBatchId(batch.id);
    },
  };
}
