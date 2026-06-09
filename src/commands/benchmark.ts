import {
  ApertisClient,
  clientFromOptions,
  type ChatCompletion,
} from "../lib/client.js";
import {
  latencyStats,
  printJson,
  renderTable,
  usd,
  dim,
  warn,
} from "../lib/format.js";
import type { GlobalOptions } from "./options.js";

export interface BenchmarkOptions extends GlobalOptions {
  runs: number;
  prompt: string;
  maxTokens: number;
}

export interface RunSample {
  /** Client-measured wall-clock latency in ms. */
  wallMs: number;
  completionTokens: number;
  /** Server-reported total duration, if present. */
  serverMs?: number;
}

export interface ModelResult {
  model: string;
  runs: number;
  errors: number;
  latency: ReturnType<typeof latencyStats>;
  serverAvgMs: number | null;
  tokensPerSec: number | null;
  /** Total measured cost across runs (USD), via used_quota_usd delta. */
  costTotalUsd: number | null;
  costPerCallUsd: number | null;
  /** Message from the last failed run, if any (helps explain errors). */
  lastError?: string;
}

/** Read used_quota_usd, returning null on any failure or non-finite value. */
async function readUsedQuota(client: ApertisClient): Promise<number | null> {
  try {
    const v = (await client.getTokenUsage()).data.used_quota_usd;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Aggregate per-model run samples into the reported metrics. Pure + testable. */
export function aggregate(
  model: string,
  samples: RunSample[],
  errors: number,
  costTotalUsd: number | null,
): ModelResult {
  const wall = samples.map((s) => s.wallMs);
  const serverSamples = samples
    .map((s) => s.serverMs)
    .filter((v): v is number => v != null);
  const totalCompletion = samples.reduce((s, r) => s + r.completionTokens, 0);
  const totalWallSec = wall.reduce((s, v) => s + v, 0) / 1000;
  return {
    model,
    runs: samples.length,
    errors,
    latency: latencyStats(wall),
    serverAvgMs:
      serverSamples.length > 0
        ? serverSamples.reduce((s, v) => s + v, 0) / serverSamples.length
        : null,
    tokensPerSec:
      totalWallSec > 0 && totalCompletion > 0
        ? totalCompletion / totalWallSec
        : null,
    costTotalUsd,
    costPerCallUsd:
      costTotalUsd != null && samples.length > 0
        ? costTotalUsd / samples.length
        : null,
  };
}

async function benchmarkModel(
  client: ApertisClient,
  model: string,
  opts: BenchmarkOptions,
): Promise<ModelResult> {
  // Bracket the whole run with usage reads so the delta = real measured spend.
  const usedBefore = await readUsedQuota(client);

  const samples: RunSample[] = [];
  let errors = 0;
  let lastError: string | undefined;
  for (let i = 0; i < opts.runs; i++) {
    const started = performance.now();
    let resp: ChatCompletion;
    try {
      resp = await client.chatCompletion({
        model,
        max_tokens: opts.maxTokens,
        messages: [{ role: "user", content: opts.prompt }],
      });
    } catch (e) {
      errors++;
      lastError = (e as Error).message;
      continue;
    }
    const wallMs = performance.now() - started;
    samples.push({
      wallMs,
      completionTokens: resp.usage?.completion_tokens ?? 0,
      serverMs: resp.usage?.latency_checkpoint?.total_duration_ms,
    });
  }

  let costTotal: number | null = null;
  if (usedBefore != null) {
    const usedAfter = await readUsedQuota(client);
    // Only report cost when both bracket reads are finite numbers.
    if (usedAfter != null) costTotal = Math.max(0, usedAfter - usedBefore);
  }

  const result = aggregate(model, samples, errors, costTotal);
  if (lastError) result.lastError = lastError;
  return result;
}

export async function benchmarkCommand(
  models: string[],
  opts: BenchmarkOptions,
): Promise<void> {
  const { client } = clientFromOptions(opts);

  const results: ModelResult[] = [];
  for (const model of models) {
    if (!opts.json)
      console.log(dim(`benchmarking ${model} (${opts.runs} runs)…`));
    results.push(await benchmarkModel(client, model, opts));
  }

  // Every run of every model failed → this is a failure, not a 0-cost success.
  if (results.every((r) => r.runs === 0)) {
    const reason = results.find((r) => r.lastError)?.lastError;
    throw new Error(
      `All benchmark runs failed.${reason ? ` Last error: ${reason}` : ""}`,
    );
  }

  if (opts.json) {
    printJson(results);
    return;
  }

  console.log(
    renderTable(
      [
        "Model",
        "Avg ms",
        "p50 ms",
        "Server ms",
        "Tok/s",
        "Cost/call",
        "Errors",
      ],
      results.map((r) => [
        r.model,
        r.latency.avg.toFixed(0),
        r.latency.p50.toFixed(0),
        r.serverAvgMs != null ? r.serverAvgMs.toFixed(0) : "—",
        r.tokensPerSec != null ? r.tokensPerSec.toFixed(1) : "—",
        r.costPerCallUsd != null ? usd(r.costPerCallUsd) : "—",
        r.errors > 0 ? warn(String(r.errors)) : "0",
      ]),
    ),
  );
  console.log(
    dim(
      "Cost is measured from your key's used_quota_usd delta (best-effort; " +
        "concurrent use of the same key during the run can inflate it).",
    ),
  );
}
