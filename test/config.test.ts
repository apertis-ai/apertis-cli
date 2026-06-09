import { describe, it, expect } from "vitest";
import { resolveConfig, DEFAULT_BASE_URL } from "../src/lib/config.js";

describe("resolveConfig precedence", () => {
  it("prefers the --key flag over env and file", () => {
    const r = resolveConfig({
      flagKey: "sk-flag",
      env: { APERTIS_API_KEY: "sk-env" },
      fileConfig: { apiKey: "sk-file" },
    });
    expect(r.apiKey).toBe("sk-flag");
    expect(r.keySource).toBe("flag");
  });

  it("falls back to env when no flag", () => {
    const r = resolveConfig({
      env: { APERTIS_API_KEY: "sk-env" },
      fileConfig: { apiKey: "sk-file" },
    });
    expect(r.apiKey).toBe("sk-env");
    expect(r.keySource).toBe("env");
  });

  it("falls back to the config file last", () => {
    const r = resolveConfig({ env: {}, fileConfig: { apiKey: "sk-file" } });
    expect(r.apiKey).toBe("sk-file");
    expect(r.keySource).toBe("file");
  });

  it("throws a friendly error when no key anywhere", () => {
    expect(() => resolveConfig({ env: {}, fileConfig: null })).toThrow(
      /No Apertis API key/,
    );
  });

  it("uses the default base URL when none configured", () => {
    const r = resolveConfig({ flagKey: "sk-x", env: {}, fileConfig: null });
    expect(r.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it("base URL precedence: flag > env > file", () => {
    expect(
      resolveConfig({
        flagKey: "sk-x",
        flagBaseUrl: "https://flag/v1",
        env: { APERTIS_BASE_URL: "https://env/v1" },
        fileConfig: { baseUrl: "https://file/v1" },
      }).baseUrl,
    ).toBe("https://flag/v1");
    expect(
      resolveConfig({
        flagKey: "sk-x",
        env: { APERTIS_BASE_URL: "https://env/v1" },
        fileConfig: { baseUrl: "https://file/v1" },
      }).baseUrl,
    ).toBe("https://env/v1");
    expect(
      resolveConfig({
        flagKey: "sk-x",
        env: {},
        fileConfig: { baseUrl: "https://file/v1" },
      }).baseUrl,
    ).toBe("https://file/v1");
  });
});
