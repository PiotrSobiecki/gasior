export type Measurement = {
  id: string;
  batchId: string;
  measuredAt: string; // ISO timestamp
  brix: number | null;
  sg: number | null;
  temperatureC: number | null;
  note: string | null;
  createdAt: string;
};

export type MeasurementInput = {
  batchId: string;
  measuredAt: string;
  brix: number | null;
  sg: number | null;
  temperatureC: number | null;
  note: string | null;
};

export interface MeasurementRepo {
  create(input: MeasurementInput): Promise<Measurement>;
  // Lista pomiarów dla nastawu, posortowana chronologicznie (najstarsze pierwsze).
  listByBatchId(batchId: string): Promise<Measurement[]>;
}
