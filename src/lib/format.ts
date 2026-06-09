import Table from "cli-table3";
import pc from "picocolors";

/** Mask an API key for display: keep the sk- style prefix and last 4 chars.
 * Only reveal those 9 chars when the key is long enough to keep ≥11 hidden. */
export function maskKey(key: string): string {
  if (key.length < 20) return "****";
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

/** Redact anything that looks like an Apertis API key from arbitrary text
 * (e.g. an upstream error body that echoed the Authorization header), so a
 * key can never reach stdout/stderr via an error path. */
export function redactSecrets(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_-]{8,}/g, (m) => maskKey(m));
}

/** Format a USD amount with enough precision for tiny per-call costs. */
export function usd(amount: number): string {
  if (amount === 0) return "$0";
  if (Math.abs(amount) < 0.01) return `$${amount.toFixed(6)}`;
  return `$${amount.toFixed(4)}`;
}

export interface LatencyStats {
  avg: number;
  p50: number;
  min: number;
  max: number;
}

/** Compute avg / median / min / max over a sample (ms). Empty sample → zeros. */
export function latencyStats(samples: number[]): LatencyStats {
  if (samples.length === 0) return { avg: 0, p50: 0, min: 0, max: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const p50 =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  return {
    avg: sum / sorted.length,
    p50,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

/** Build a bordered table; header row dimmed. Returns the rendered string. */
export function renderTable(
  head: string[],
  rows: Array<Array<string | number>>,
): string {
  const table = new Table({ head: head.map((h) => pc.dim(h)) });
  for (const row of rows) table.push(row.map(String));
  return table.toString();
}

export const ok = (s: string): string => pc.green(s);
export const warn = (s: string): string => pc.yellow(s);
export const dim = (s: string): string => pc.dim(s);
