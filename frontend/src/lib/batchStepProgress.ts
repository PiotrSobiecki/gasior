// Fallback lokalny postępu checklisty (stare nastawy sprzed syncu z API).
// Nowe nastawy zapisują checkedStepIndices w bazie przez PATCH /api/batches.

const STORAGE_PREFIX = "gasior:batch-steps:";

function storageKey(batchId: string): string {
  return `${STORAGE_PREFIX}${batchId}`;
}

export function loadCheckedStepIndices(batchId: string): Set<number> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(batchId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((n): n is number => typeof n === "number" && Number.isInteger(n)),
    );
  } catch {
    return new Set();
  }
}

export function saveCheckedStepIndices(
  batchId: string,
  checked: Set<number>,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    storageKey(batchId),
    JSON.stringify([...checked].sort((a, b) => a - b)),
  );
}
