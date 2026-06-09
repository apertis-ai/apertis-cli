import { homedir } from "node:os";
import { join } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";

export const DEFAULT_BASE_URL = "https://api.apertis.ai/v1";

export interface ApertisConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface ResolveOptions {
  /** Value of an explicit --key flag, if provided. */
  flagKey?: string;
  /** Value of an explicit --base-url flag, if provided. */
  flagBaseUrl?: string;
  /** Override the environment map (defaults to process.env). Used in tests. */
  env?: NodeJS.ProcessEnv;
  /** Override the config-file contents (skips disk read). Used in tests. */
  fileConfig?: ApertisConfig | null;
}

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  /** Where the API key came from — useful for error messages. */
  keySource: "flag" | "env" | "file";
}

export function configDir(): string {
  return join(homedir(), ".apertis");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfigFile(): ApertisConfig | null {
  const path = configPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ApertisConfig;
  } catch {
    return null;
  }
}

/**
 * Persist a key (and optionally base URL) to ~/.apertis/config.json with
 * owner-only permissions (0600). Merges with any existing config.
 */
export function writeConfigFile(update: ApertisConfig): string {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const current = readConfigFile() ?? {};
  const merged = { ...current, ...update };
  const path = configPath();
  // Tighten perms BEFORE writing so a pre-existing loose-mode (e.g. 0644) file
  // never briefly holds the new key while world-readable.
  if (existsSync(path)) chmodSync(path, 0o600);
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600); // belt-and-suspenders for the freshly-created case
  return path;
}

/**
 * Resolve the API key and base URL using the precedence:
 *   --key flag  >  APERTIS_API_KEY env  >  ~/.apertis/config.json
 * Base URL precedence mirrors it, falling back to the public gateway.
 * Throws a friendly error if no key can be found.
 */
export function resolveConfig(opts: ResolveOptions = {}): ResolvedConfig {
  const env = opts.env ?? process.env;
  const file =
    opts.fileConfig !== undefined ? opts.fileConfig : readConfigFile();

  let apiKey: string | undefined;
  let keySource: ResolvedConfig["keySource"] | undefined;
  if (opts.flagKey) {
    apiKey = opts.flagKey;
    keySource = "flag";
  } else if (env.APERTIS_API_KEY) {
    apiKey = env.APERTIS_API_KEY;
    keySource = "env";
  } else if (file?.apiKey) {
    apiKey = file.apiKey;
    keySource = "file";
  }

  if (!apiKey || !keySource) {
    throw new Error(
      "No Apertis API key found. Provide one with --key, set APERTIS_API_KEY, " +
        "or run `apertis config set-key <key>`. Get a key at https://apertis.ai.",
    );
  }

  const baseUrl =
    opts.flagBaseUrl ||
    env.APERTIS_BASE_URL ||
    file?.baseUrl ||
    DEFAULT_BASE_URL;

  return { apiKey, baseUrl, keySource };
}
