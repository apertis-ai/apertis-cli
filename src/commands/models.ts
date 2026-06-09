import { clientFromOptions, type ModelEntry } from "../lib/client.js";
import { printJson, renderTable, dim } from "../lib/format.js";
import type { GlobalOptions } from "./options.js";

export interface ModelsOptions extends GlobalOptions {
  owner?: string;
  search?: string;
}

/** Filter models by owner (exact, case-insensitive) and/or id substring. */
export function filterModels(
  models: ModelEntry[],
  opts: ModelsOptions,
): ModelEntry[] {
  let out = models;
  if (opts.owner) {
    const owner = opts.owner.toLowerCase();
    out = out.filter((m) => (m.owned_by ?? "").toLowerCase() === owner);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    out = out.filter((m) => m.id.toLowerCase().includes(q));
  }
  return [...out].sort((a, b) => a.id.localeCompare(b.id));
}

export async function modelsCommand(opts: ModelsOptions): Promise<void> {
  const { client } = clientFromOptions(opts);
  const models = filterModels(await client.getModels(), opts);

  if (opts.json) {
    printJson(models);
    return;
  }

  if (models.length === 0) {
    console.log(dim("No models match the filter."));
    return;
  }

  console.log(
    renderTable(
      ["Model", "Owner"],
      models.map((m) => [m.id, m.owned_by ?? "—"]),
    ),
  );
  console.log(dim(`${models.length} model(s)`));
}
