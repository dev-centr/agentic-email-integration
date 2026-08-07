import { loadConfig } from "../config.js";
import { runCheck } from "./check.js";

export async function runWatch(opts: {
  configPath?: string;
  dryRun?: boolean;
}): Promise<number> {
  const { config } = loadConfig(opts.configPath);
  const intervalMs = Math.max(15, config.pollIntervalSeconds) * 1000;
  console.log(
    `Watching every ${config.pollIntervalSeconds}s (Ctrl+C to stop). dryRun=${Boolean(opts.dryRun)}`,
  );

  let stopping = false;
  const onSignal = () => {
    stopping = true;
    console.log("\nStopping after current poll…");
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  while (!stopping) {
    try {
      await runCheck({
        configPath: opts.configPath,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
    if (stopping) break;
    await sleep(intervalMs);
  }
  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
