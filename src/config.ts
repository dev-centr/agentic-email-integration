import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSON5 from "json5";

export type MatchRule = {
  fromIncludes?: string[];
  subjectIncludesAny?: string[];
  subjectIncludesAll?: string[];
};

export type Rule = {
  name: string;
  action: "draft-reply" | "investigate-ci" | "ignore";
  match: MatchRule;
};

export type AppConfig = {
  account: string;
  mailbox: string;
  pollIntervalSeconds: number;
  pageSize: number;
  unreadOnly: boolean;
  cursor: {
    apiKeyEnv: string;
    model: string;
    defaultCwd: string;
    repoRoots: Record<string, string>;
  };
  safety: {
    createDraftOnly: boolean;
    neverAutoSend: boolean;
  };
  rules: Rule[];
};

const DEFAULTS: AppConfig = {
  account: "gmail",
  mailbox: "INBOX",
  pollIntervalSeconds: 120,
  pageSize: 25,
  unreadOnly: true,
  cursor: {
    apiKeyEnv: "CURSOR_API_KEY",
    model: "composer-2.5",
    defaultCwd: process.cwd(),
    repoRoots: {},
  },
  safety: {
    createDraftOnly: true,
    neverAutoSend: true,
  },
  rules: [],
};

export function defaultConfigPaths(): string[] {
  const home = os.homedir();
  const appData = process.env.APPDATA;
  const paths = [
    path.join(process.cwd(), "config.local.json5"),
    path.join(process.cwd(), "config.json5"),
  ];
  if (appData) {
    paths.push(path.join(appData, "agentic-email-integration", "config.json5"));
  }
  paths.push(
    path.join(home, ".config", "agentic-email-integration", "config.json5"),
  );
  return paths;
}

export function resolveConfigPath(explicit?: string): string | undefined {
  if (explicit) return explicit;
  return defaultConfigPaths().find((p) => fs.existsSync(p));
}

export function loadConfig(explicitPath?: string): {
  config: AppConfig;
  path: string | null;
} {
  const resolved = resolveConfigPath(explicitPath);
  if (!resolved) {
    return { config: structuredClone(DEFAULTS), path: null };
  }
  const raw = fs.readFileSync(resolved, "utf8");
  const parsed = JSON5.parse(raw) as Partial<AppConfig>;
  return {
    path: resolved,
    config: mergeConfig(DEFAULTS, parsed),
  };
}

function mergeConfig(base: AppConfig, overlay: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...overlay,
    cursor: { ...base.cursor, ...(overlay.cursor ?? {}) },
    safety: { ...base.safety, ...(overlay.safety ?? {}) },
    rules: overlay.rules ?? base.rules,
  };
}

export function stateDir(): string {
  const appData = process.env.APPDATA;
  const base = appData
    ? path.join(appData, "agentic-email-integration")
    : path.join(os.homedir(), ".local", "state", "agentic-email-integration");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

export function processedPath(): string {
  return path.join(stateDir(), "processed.json");
}
