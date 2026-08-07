import { loadConfig } from "../config.js";
import {
  classify,
  guessRepo,
  resolveCwd,
} from "../mail/classify.js";
import { listEnvelopes, readMessage } from "../mail/himalaya.js";
import { buildPrompt, runCursorAgent } from "../agent/cursor.js";
import { loadProcessed, markProcessed } from "../state.js";

export type CheckOptions = {
  configPath?: string;
  dryRun?: boolean;
  once?: boolean;
  limit?: number;
};

export async function runCheck(opts: CheckOptions = {}): Promise<number> {
  const { config, path: cfgPath } = loadConfig(opts.configPath);
  if (!cfgPath) {
    console.error(
      "No config found. Copy config.example.json5 to config.local.json5 or %APPDATA%/agentic-email-integration/config.json5",
    );
    return 4;
  }

  const processed = loadProcessed();
  let envelopes = listEnvelopes({
    account: config.account,
    mailbox: config.mailbox,
    pageSize: config.pageSize,
    unreadOnly: config.unreadOnly,
  });

  envelopes = envelopes.filter((e) => e.id && !processed.has(e.id));
  const classified = classify(envelopes, config.rules);
  const batch = opts.limit ? classified.slice(0, opts.limit) : classified;

  if (batch.length === 0) {
    console.log("No matching unprocessed mail.");
    return 0;
  }

  console.log(`Matched ${batch.length} message(s).`);
  const done: string[] = [];
  let failures = 0;

  for (const item of batch) {
    const { envelope, rule } = item;
    console.log(`→ [${rule.name}/${rule.action}] ${envelope.subject}`);
    let body = "";
    try {
      body = readMessage(envelope.id, { account: config.account });
    } catch (err) {
      console.error(
        `  failed to read message: ${err instanceof Error ? err.message : err}`,
      );
      failures += 1;
      continue;
    }

    const repo = guessRepo(envelope.subject, body);
    const cwd = resolveCwd(
      repo,
      config.cursor.repoRoots,
      config.cursor.defaultCwd,
    );
    const prompt = buildPrompt({
      rule,
      envelope,
      body,
      cwd,
      safety: config.safety,
    });

    const result = await runCursorAgent({
      config,
      prompt,
      cwd,
      dryRun: opts.dryRun,
    });

    if (result.status === "finished" || result.status === "skipped") {
      console.log(`  ${result.status}${result.runId ? ` run=${result.runId}` : ""}`);
      if (result.resultText && opts.dryRun) {
        console.log(result.resultText.slice(0, 2000));
      }
      done.push(envelope.id);
    } else {
      failures += 1;
      console.error(`  error: ${result.error ?? result.status}`);
    }
  }

  if (!opts.dryRun && done.length) {
    markProcessed(done);
  }

  return failures > 0 ? 2 : 0;
}
