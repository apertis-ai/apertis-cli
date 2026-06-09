import { Command } from "commander";
import { ApertisApiError } from "./lib/client.js";
import { usageCommand } from "./commands/usage.js";
import { modelsCommand } from "./commands/models.js";
import { benchmarkCommand } from "./commands/benchmark.js";
import { setKeyCommand, showConfigCommand } from "./commands/config.js";
import { redactSecrets } from "./lib/format.js";
import type { GlobalOptions } from "./commands/options.js";

const program = new Command();

program
  .name("apertis")
  .description(
    "Apertis CLI — usage, cost, and model benchmarks for the Apertis API gateway.",
  )
  .version("0.1.0")
  .option("-k, --key <key>", "Apertis API key (overrides env and config file)")
  .option(
    "--base-url <url>",
    "API base URL (default https://api.apertis.ai/v1)",
  )
  .option("--json", "Output machine-readable JSON");

/** Merge global options (parsed on the root program) with a command's own options. */
function globals(cmd: Command): GlobalOptions {
  return { ...program.opts(), ...cmd.opts() };
}

program
  .command("usage")
  .description("Show your API key's usage and spend")
  .action(async (_o: unknown, cmd: Command) => {
    await usageCommand(globals(cmd));
  });

program
  .command("models")
  .description("List available models")
  .option("--owner <owner>", "Filter by provider/owner (e.g. openai)")
  .option("--search <text>", "Filter by model id substring")
  .action(async (_o: unknown, cmd: Command) => {
    await modelsCommand(globals(cmd));
  });

program
  .command("benchmark")
  .argument("<models...>", "One or more model ids to benchmark")
  .description("Benchmark latency, throughput, and measured cost across models")
  .option("-n, --runs <n>", "Number of calls per model", "3")
  .option(
    "--prompt <text>",
    "Prompt to send",
    "Reply with a one-sentence haiku about the sea.",
  )
  .option("--max-tokens <n>", "Max tokens per call", "64")
  .action(async (models: string[], _o: unknown, cmd: Command) => {
    const g = globals(cmd);
    const o = cmd.opts();
    await benchmarkCommand(models, {
      ...g,
      runs: Math.max(1, parseInt(o.runs, 10) || 3),
      prompt: o.prompt,
      maxTokens: Math.max(1, parseInt(o.maxTokens, 10) || 64),
    });
  });

const config = program
  .command("config")
  .description("Manage the saved API key and base URL");
config
  .command("set-key")
  .argument("<key>", "Apertis API key to save")
  .option("--base-url <url>", "Also save a custom base URL")
  .action((key: string, o: { baseUrl?: string }) => {
    setKeyCommand(key, o);
  });
config
  .command("show")
  .description("Show the saved config (key masked)")
  .action(() => {
    showConfigCommand();
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    const raw =
      err instanceof ApertisApiError || err instanceof Error
        ? err.message
        : String(err);
    console.error(`\x1b[31merror:\x1b[0m ${redactSecrets(raw)}`);
    process.exit(1);
  }
}

void main();
