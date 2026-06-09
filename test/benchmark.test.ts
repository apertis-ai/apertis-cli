import { describe, it, expect } from "vitest";
import { aggregate, type RunSample } from "../src/commands/benchmark.js";

const samples: RunSample[] = [
  { wallMs: 100, completionTokens: 50, serverMs: 80 },
  { wallMs: 200, completionTokens: 50, serverMs: 120 },
];

describe("aggregate", () => {
  it("computes latency, server avg, throughput, and per-call cost", () => {
    const r = aggregate("gpt-4o-mini", samples, 0, 0.0002);
    expect(r.runs).toBe(2);
    expect(r.latency.avg).toBe(150);
    expect(r.serverAvgMs).toBe(100);
    // 100 completion tokens over 0.3s wall = ~333 tok/s
    expect(r.tokensPerSec).toBeCloseTo(333.33, 1);
    expect(r.costTotalUsd).toBe(0.0002);
    expect(r.costPerCallUsd).toBe(0.0001);
  });

  it("reports null cost when the usage delta is unavailable", () => {
    const r = aggregate("m", samples, 0, null);
    expect(r.costTotalUsd).toBeNull();
    expect(r.costPerCallUsd).toBeNull();
  });

  it("leaves server avg null when no server timings present", () => {
    const r = aggregate("m", [{ wallMs: 100, completionTokens: 10 }], 0, null);
    expect(r.serverAvgMs).toBeNull();
  });

  it("counts errors and tolerates zero successful runs", () => {
    const r = aggregate("m", [], 3, null);
    expect(r.runs).toBe(0);
    expect(r.errors).toBe(3);
    expect(r.tokensPerSec).toBeNull();
    expect(r.costPerCallUsd).toBeNull();
  });
});
