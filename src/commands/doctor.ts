import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, stateDir } from "../config.js";
import { himalayaAvailable } from "../mail/himalaya.js";
import { versionLine, BUILD_ID, CHANNEL, VERSION } from "../version.js";

export function runDoctor(configPath?: string): number {
  const { config, path: resolved } = loadConfig(configPath);
  const himalaya = himalayaAvailable();
  const apiKeyEnv = config.cursor.apiKeyEnv;
  const hasKey = Boolean(process.env[apiKeyEnv]);

  const dump = {
    product: "agentic-email-integration",
    version: VERSION,
    channel: CHANNEL,
    buildId: BUILD_ID,
    versionLine: versionLine(),
    node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cwd: process.cwd(),
    configPath: resolved,
    account: config.account,
    mailbox: config.mailbox,
    himalaya: himalaya.ok
      ? { ok: true, version: himalaya.version }
      : { ok: false, error: himalaya.error },
    cursorApiKey: hasKey ? "set" : "missing",
    cursorModel: config.cursor.model,
    defaultCwd: config.cursor.defaultCwd,
    stateDir: stateDir(),
    safety: config.safety,
    ruleCount: config.rules.length,
  };

  const outPath = path.join(stateDir(), `doctor-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8");

  console.log(JSON.stringify(dump, null, 2));
  console.error(`doctor dump written: ${outPath}`);

  if (!himalaya.ok) return 2;
  if (!hasKey) return 3;
  if (!resolved) return 4;
  return 0;
}
