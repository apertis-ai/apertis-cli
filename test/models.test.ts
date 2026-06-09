import { describe, it, expect } from "vitest";
import { filterModels } from "../src/commands/models.js";
import type { ModelEntry } from "../src/lib/client.js";

const models: ModelEntry[] = [
  { id: "gpt-4o-mini", owned_by: "openai" },
  { id: "gpt-4o", owned_by: "openai" },
  { id: "claude-sonnet-4-6", owned_by: "anthropic" },
];

describe("filterModels", () => {
  it("filters by owner case-insensitively and sorts by id", () => {
    const r = filterModels(models, { owner: "OpenAI" });
    expect(r.map((m) => m.id)).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("filters by id substring", () => {
    expect(filterModels(models, { search: "claude" }).map((m) => m.id)).toEqual(
      ["claude-sonnet-4-6"],
    );
  });

  it("combines owner and search", () => {
    expect(
      filterModels(models, { owner: "openai", search: "mini" }).map(
        (m) => m.id,
      ),
    ).toEqual(["gpt-4o-mini"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterModels(models, { owner: "google" })).toEqual([]);
  });
});
