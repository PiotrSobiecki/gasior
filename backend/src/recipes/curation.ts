import type { RecipeRepo } from "./repo";
import { parseRecipeImport } from "./import";
import { validateRecipe } from "./validate";

export type Command =
  | { action: "add"; file: string; force?: boolean }
  | { action: "update"; id: string; file: string; force?: boolean }
  | { action: "delete"; id: string };

export type ParseResult =
  | { ok: true; command: Command }
  | { ok: false; error: string };

export type RunDeps = {
  repo: RecipeRepo;
  readFile: (path: string) => unknown;
};

export type RunResult = { ok: true; message: string } | { ok: false; error: string };

export function parseCommand(argv: string[]): ParseResult {
  const force = argv.includes("--force");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [action, ...rest] = positional;

  if (action === "add") {
    if (!rest[0]) return { ok: false, error: "add wymaga ścieżki do pliku" };
    const cmd: Command = { action: "add", file: rest[0] };
    if (force) cmd.force = true;
    return { ok: true, command: cmd };
  }

  if (action === "update") {
    if (!rest[0] || !rest[1])
      return { ok: false, error: "update wymaga <id> <plik>" };
    const cmd: Command = { action: "update", id: rest[0], file: rest[1] };
    if (force) cmd.force = true;
    return { ok: true, command: cmd };
  }

  if (action === "delete") {
    if (!rest[0]) return { ok: false, error: "delete wymaga <id>" };
    return { ok: true, command: { action: "delete", id: rest[0] } };
  }

  return { ok: false, error: `Nieznana komenda: ${action ?? "(brak)"}` };
}

export async function runCommand(
  command: Command,
  { repo, readFile }: RunDeps,
): Promise<RunResult> {
  if (command.action === "add") {
    const parsed = parseRecipeImport(readFile(command.file));
    if (!parsed.ok)
      return { ok: false, error: "Niepoprawna receptura w pliku" };

    const validation = validateRecipe(parsed.value);
    if (validation.verdict === "fail" && !command.force) {
      return {
        ok: false,
        error: `Walidator odrzucił recepturę (verdict: fail). Użyj --force, by mimo to zapisać. Issues: ${validation.issues.map((i) => i.message).join("; ")}`,
      };
    }

    // Gate statusu: tylko czysty "pass" daje "validated". Warn/fail (wymuszony) → "draft".
    const status: "draft" | "validated" =
      validation.verdict === "pass" ? "validated" : "draft";
    const created = await repo.create({ ...parsed.value, status });
    const forcedNote = validation.verdict === "fail" ? " [FORCED]" : "";
    return {
      ok: true,
      message: `Dodano (${validation.verdict})${forcedNote}: ${created.name} (${created.id})`,
    };
  }

  if (command.action === "update") {
    const parsed = parseRecipeImport(readFile(command.file));
    if (!parsed.ok)
      return { ok: false, error: "Niepoprawna receptura w pliku" };
    const updated = await repo.update(command.id, parsed.value);
    if (!updated)
      return { ok: false, error: `Nie znaleziono receptury: ${command.id}` };
    return { ok: true, message: `Zaktualizowano: ${updated.name} (${updated.id})` };
  }

  if (command.action === "delete") {
    const removed = await repo.delete(command.id);
    if (!removed)
      return { ok: false, error: `Nie znaleziono receptury: ${command.id}` };
    return { ok: true, message: `Usunięto: ${command.id}` };
  }

  return { ok: false, error: `Nieobsługiwana akcja` };
}
