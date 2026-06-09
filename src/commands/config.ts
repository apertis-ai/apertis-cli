import { writeConfigFile, readConfigFile, configPath } from "../lib/config.js";
import { maskKey, ok, dim } from "../lib/format.js";

export function setKeyCommand(key: string, opts: { baseUrl?: string }): void {
  if (!key || !key.startsWith("sk-")) {
    throw new Error(
      "Key must start with `sk-`. Get one at https://apertis.ai.",
    );
  }
  const path = writeConfigFile({
    apiKey: key,
    ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}),
  });
  console.log(ok(`Saved key ${maskKey(key)} to ${path} (permissions 0600).`));
}

export function showConfigCommand(): void {
  const cfg = readConfigFile();
  if (!cfg?.apiKey) {
    console.log(
      dim(
        `No config at ${configPath()}. Run \`apertis config set-key <key>\`.`,
      ),
    );
    return;
  }
  console.log(`config: ${configPath()}`);
  console.log(`  key:      ${maskKey(cfg.apiKey)}`);
  console.log(`  base URL: ${cfg.baseUrl ?? "(default)"}`);
}
