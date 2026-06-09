import { resolveConfig, type ResolvedConfig } from "./config.js";

// Cloudflare in front of api.apertis.ai blocks requests with a non-browser
// User-Agent (returns HTTP 403, error code 1010). Node/undici's default UA is
// blocked, so every request MUST send a browser-like UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export class ApertisApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApertisApiError";
  }
}

export interface TokenUsage {
  token_name: string;
  total_quota_usd: number;
  total_tokens: number;
  total_requests: number;
  remain_quota_usd: number;
  used_quota_usd: number;
}

export interface ModelEntry {
  id: string;
  owned_by?: string;
  created?: number;
}

export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** Apertis exposes a server-side latency breakdown not available from generic providers. */
  latency_checkpoint?: {
    engine_ttft_ms?: number;
    engine_ttlt_ms?: number;
    service_ttft_ms?: number;
    total_duration_ms?: number;
    [k: string]: number | undefined;
  };
}

export interface ChatCompletion {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: ChatUsage;
}

export class ApertisClient {
  constructor(private readonly config: ResolvedConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = this.config.baseUrl.replace(/\/$/, "") + path;
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "User-Agent": BROWSER_UA,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });
    } catch (cause) {
      throw new ApertisApiError(
        `Network error reaching ${url}: ${(cause as Error).message}`,
        0,
      );
    }

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }

    if (!res.ok) {
      throw new ApertisApiError(
        describeError(res.status, body),
        res.status,
        body,
      );
    }
    return body as T;
  }

  getTokenUsage(): Promise<{ data: TokenUsage }> {
    return this.request<{ data: TokenUsage }>("/token/usage");
  }

  async getModels(): Promise<ModelEntry[]> {
    const res = await this.request<{ data?: ModelEntry[] }>("/models");
    return res.data ?? [];
  }

  chatCompletion(body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  }): Promise<ChatCompletion> {
    return this.request<ChatCompletion>("/chat/completions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

/** Resolve config from global flags and build a client — shared by every command. */
export function clientFromOptions(opts: { key?: string; baseUrl?: string }): {
  client: ApertisClient;
  config: ResolvedConfig;
} {
  const config = resolveConfig({
    flagKey: opts.key,
    flagBaseUrl: opts.baseUrl,
  });
  return { client: new ApertisClient(config), config };
}

/** Map common API failures to actionable messages (mirrors apertis-quickstart troubleshooting). */
export function describeError(status: number, body: unknown): string {
  const apiMessage =
    body && typeof body === "object" && "error" in body
      ? ((body as { error?: { message?: string } }).error?.message ?? "")
      : "";
  switch (status) {
    case 401:
      return "401 Unauthorized — invalid or missing API key. Check your key at https://apertis.ai.";
    case 403:
      return "403 Forbidden — request blocked (possibly the gateway WAF). Retry; if it persists, contact hi@apertis.ai.";
    case 404:
      return "404 Not Found — check the base URL is https://api.apertis.ai/v1.";
    case 429:
      return "429 Rate limited — slow down and retry; heavy usage may need a higher plan.";
    default:
      return apiMessage
        ? `HTTP ${status} — ${apiMessage}`
        : `HTTP ${status} — request failed.`;
  }
}
