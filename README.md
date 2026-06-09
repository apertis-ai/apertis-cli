# Apertis CLI

`apertis` — a tiny CLI for the [Apertis](https://apertis.ai) API gateway. See your
usage and spend, list 500+ models, and **benchmark latency, throughput, and real
measured cost** across models — straight from your terminal.

OpenAI-compatible gateway, one command to check what you're spending.

## Install

```bash
npm install -g @apertis/cli
```

Or run without installing:

```bash
npx @apertis/cli usage
```

> Requires Node.js 18+.

## Setup

Get an API key at <https://apertis.ai>, then provide it any of these ways
(highest precedence first):

```bash
apertis --key sk-... usage          # 1. per-command flag
export APERTIS_API_KEY=sk-...       # 2. environment variable
apertis config set-key sk-...       # 3. saved to ~/.apertis/config.json (chmod 0600)
```

> **Security note:** a key passed as a command argument (`--key`, `config set-key`)
> can be captured by your shell history and process listings. For sensitive or
> shared machines, prefer `APERTIS_API_KEY` or the saved config file. The CLI never
> prints your full key — it is masked in all output and redacted from error messages.

## Commands

### `apertis usage`

Your API key's lifetime usage and spend.

```bash
apertis usage
apertis usage --json
```

### `apertis models`

List available models, with optional filters.

```bash
apertis models
apertis models --owner openai
apertis models --search claude
apertis models --json
```

### `apertis benchmark <models...>`

Benchmark one or more models head-to-head. Reports client-measured latency
(avg / p50), Apertis's **server-side** latency, throughput (tokens/sec), and the
**actual measured cost** of the run.

```bash
apertis benchmark gpt-4o-mini claude-sonnet-4-6
apertis benchmark gpt-4o-mini -n 5 --prompt "Summarize the theory of relativity."
apertis benchmark gpt-4o-mini --json
```

Cost is measured from your key's `used_quota_usd` delta over the run (best-effort —
concurrent use of the same key during a benchmark can inflate it), so it reflects
real spend rather than a pricing-table estimate.

### `apertis config`

```bash
apertis config set-key sk-...       # save key (and optionally --base-url)
apertis config show                 # show saved config (key masked)
```

## Global flags

| Flag | Description |
|------|-------------|
| `-k, --key <key>` | API key (overrides env and config file) |
| `--base-url <url>` | API base URL (default `https://api.apertis.ai/v1`) |
| `--json` | Machine-readable JSON output |

## Development

```bash
npm install
npm test          # unit tests (vitest)
npm run build     # bundle to dist/ (tsup)
```

## Links

- [Apertis](https://apertis.ai) — get your API key
- Model list & pricing: <https://apertis.ai/pricing>
- Support: hi@apertis.ai
