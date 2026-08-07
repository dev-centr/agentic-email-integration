#!/usr/bin/env node
import { Command } from "commander";
import { versionLine } from "./version.js";
import { runDoctor } from "./commands/doctor.js";
import { runCheck } from "./commands/check.js";
import { runWatch } from "./commands/watch.js";

const program = new Command();

program
  .name("aei")
  .description(
    "Agentic email integration — poll owned Gmail via Himalaya, trigger Cursor agents for drafts and CI.",
  )
  .version(versionLine(), "-V, --version", "version + build id");

program
  .command("doctor")
  .description("Print redacted diagnostics and write a dump file")
  .option("-c, --config <path>", "config.json5 path")
  .action((opts: { config?: string }) => {
    process.exitCode = runDoctor(opts.config);
  });

program
  .command("check")
  .description("Poll once, classify, trigger Cursor agents")
  .option("-c, --config <path>", "config.json5 path")
  .option("--dry-run", "print prompts; do not call Cursor or mark processed")
  .option("-n, --limit <count>", "max messages this run", (v) => Number(v))
  .action(
    async (opts: { config?: string; dryRun?: boolean; limit?: number }) => {
      process.exitCode = await runCheck({
        configPath: opts.config,
        dryRun: opts.dryRun,
        limit: opts.limit,
      });
    },
  );

program
  .command("watch")
  .description("Poll on an interval (local checker daemon)")
  .option("-c, --config <path>", "config.json5 path")
  .option("--dry-run", "print prompts; do not call Cursor or mark processed")
  .action(async (opts: { config?: string; dryRun?: boolean }) => {
    process.exitCode = await runWatch({
      configPath: opts.config,
      dryRun: opts.dryRun,
    });
  });

await program.parseAsync(process.argv);
