import { clientFromOptions } from "../lib/client.js";
import { maskKey, printJson, renderTable, usd, dim } from "../lib/format.js";
import type { GlobalOptions } from "./options.js";

export async function usageCommand(opts: GlobalOptions): Promise<void> {
  const { client, config } = clientFromOptions(opts);
  const { data } = await client.getTokenUsage();

  if (opts.json) {
    printJson(data);
    return;
  }

  const n = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  console.log(
    dim(`key ${maskKey(config.apiKey)} · token "${data.token_name ?? "—"}"`),
  );
  console.log(
    renderTable(
      ["Metric", "Value"],
      [
        ["Used", usd(n(data.used_quota_usd))],
        ["Remaining", usd(n(data.remain_quota_usd))],
        ["Total spend", usd(n(data.total_quota_usd))],
        ["Requests", n(data.total_requests).toLocaleString()],
        ["Tokens", n(data.total_tokens).toLocaleString()],
      ],
    ),
  );
}
