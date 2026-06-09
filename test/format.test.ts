import { describe, it, expect } from "vitest";
import {
  maskKey,
  usd,
  latencyStats,
  redactSecrets,
} from "../src/lib/format.js";

describe("maskKey", () => {
  it("keeps prefix and last 4", () => {
    expect(maskKey("sk-oES2tDzwAYpyItyLEe02F83eB1464101Bb975eBaAcB9672f")).toBe(
      "sk-oE…672f",
    );
  });
  it("masks short values entirely", () => {
    expect(maskKey("sk-123")).toBe("****");
  });
  it("never contains the full key", () => {
    const key = "sk-secretmiddlepart1234";
    expect(maskKey(key)).not.toContain("secretmiddlepart");
  });
  it("fully masks keys shorter than 20 chars", () => {
    expect(maskKey("sk-1234567890")).toBe("****");
  });
});

describe("redactSecrets", () => {
  it("redacts a full key embedded in arbitrary text", () => {
    const key = "sk-oES2tDzwAYpyItyLEe02F83eB1464101Bb975eBaAcB9672f";
    const out = redactSecrets(
      `upstream error: Authorization Bearer ${key} rejected`,
    );
    expect(out).not.toContain(key);
    expect(out).toContain("sk-oE…672f");
  });
  it("leaves text without keys unchanged", () => {
    expect(redactSecrets("HTTP 500 — internal error")).toBe(
      "HTTP 500 — internal error",
    );
  });
});

describe("usd", () => {
  it("renders zero plainly", () => expect(usd(0)).toBe("$0"));
  it("uses 6 decimals for tiny amounts", () =>
    expect(usd(0.000017)).toBe("$0.000017"));
  it("uses 4 decimals for larger amounts", () =>
    expect(usd(1.05012)).toBe("$1.0501"));
});

describe("latencyStats", () => {
  it("returns zeros for empty sample", () => {
    expect(latencyStats([])).toEqual({ avg: 0, p50: 0, min: 0, max: 0 });
  });
  it("computes median for odd-length sample", () => {
    const s = latencyStats([30, 10, 20]);
    expect(s.p50).toBe(20);
    expect(s.avg).toBe(20);
    expect(s.min).toBe(10);
    expect(s.max).toBe(30);
  });
  it("averages the two middle values for even-length sample", () => {
    expect(latencyStats([10, 20, 30, 40]).p50).toBe(25);
  });
});
