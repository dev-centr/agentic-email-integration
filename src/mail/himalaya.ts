import { spawnSync } from "node:child_process";

export type Envelope = {
  id: string;
  flags: string[];
  subject: string;
  from: string;
  date: string;
};

export type HimalayaOptions = {
  account?: string;
  mailbox?: string;
  himalayaBin?: string;
};

function bin(opts: HimalayaOptions): string {
  return opts.himalayaBin ?? process.env.HIMALAYA_BIN ?? "himalaya";
}

export function himalayaAvailable(opts: HimalayaOptions = {}): {
  ok: boolean;
  version?: string;
  error?: string;
} {
  const result = spawnSync(bin(opts), ["--version"], {
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || `exit ${result.status}`).trim(),
    };
  }
  return { ok: true, version: (result.stdout || result.stderr).trim() };
}

export function listEnvelopes(
  opts: HimalayaOptions & { pageSize?: number; unreadOnly?: boolean } = {},
): Envelope[] {
  const args = [
    ...(opts.account ? ["-a", opts.account] : []),
    "envelope",
    "list",
    ...(opts.mailbox ? [opts.mailbox] : []),
    "-o",
    "json",
    ...(opts.pageSize ? ["-s", String(opts.pageSize)] : []),
  ];
  // Himalaya query syntax varies by version; prefer flag filter when unreadOnly.
  if (opts.unreadOnly) {
    args.push("--filter", "flag:unread");
  }

  const result = spawnSync(bin(opts), args, {
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.status !== 0) {
    // Retry without --filter for older Himalaya / backends that reject it.
    if (opts.unreadOnly) {
      return listEnvelopes({ ...opts, unreadOnly: false }).filter((e) =>
        e.flags.some((f) => /unread|unseen/i.test(f)),
      );
    }
    const msg = (result.stderr || result.stdout || `exit ${result.status}`).trim();
    throw new Error(`himalaya envelope list failed: ${msg}`);
  }

  const stdout = (result.stdout ?? "").trim();
  if (!stdout) return [];
  const parsed = JSON.parse(stdout) as unknown;
  return normalizeEnvelopes(parsed);
}

export function readMessage(
  id: string,
  opts: HimalayaOptions = {},
): string {
  const args = [
    ...(opts.account ? ["-a", opts.account] : []),
    "message",
    "read",
    id,
  ];
  const result = spawnSync(bin(opts), args, {
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || `exit ${result.status}`).trim();
    throw new Error(`himalaya message read failed: ${msg}`);
  }
  return result.stdout ?? "";
}

function normalizeEnvelopes(parsed: unknown): Envelope[] {
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { envelopes?: unknown }).envelopes)
      ? ((parsed as { envelopes: unknown[] }).envelopes)
      : null;
  if (!rows) {
    throw new Error("unexpected himalaya JSON shape for envelopes");
  }
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? r.uid ?? r.message_id ?? "");
    const flags = Array.isArray(r.flags)
      ? r.flags.map(String)
      : typeof r.flags === "string"
        ? r.flags.split(/\s+/)
        : [];
    const from =
      typeof r.from === "string"
        ? r.from
        : r.from && typeof r.from === "object"
          ? String(
              (r.from as { addr?: string; name?: string }).addr ??
                (r.from as { email?: string }).email ??
                JSON.stringify(r.from),
            )
          : String(r.from ?? "");
    return {
      id,
      flags,
      subject: String(r.subject ?? ""),
      from,
      date: String(r.date ?? r.sent_at ?? ""),
    };
  });
}
