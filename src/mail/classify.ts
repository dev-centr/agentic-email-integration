import type { Envelope } from "./himalaya.js";
import type { MatchRule, Rule } from "../config.js";

export type Classified = {
  envelope: Envelope;
  rule: Rule;
};

export function classify(
  envelopes: Envelope[],
  rules: Rule[],
): Classified[] {
  const out: Classified[] = [];
  for (const envelope of envelopes) {
    const rule = rules.find((r) => matches(envelope, r.match));
    if (!rule || rule.action === "ignore") continue;
    out.push({ envelope, rule });
  }
  return out;
}

export function matches(envelope: Envelope, rule: MatchRule): boolean {
  const from = envelope.from.toLowerCase();
  const subject = envelope.subject.toLowerCase();
  let hasCriteria = false;

  if (rule.fromIncludes?.length) {
    hasCriteria = true;
    const ok = rule.fromIncludes.some((f) => from.includes(f.toLowerCase()));
    if (!ok) return false;
  }
  if (rule.subjectIncludesAny?.length) {
    hasCriteria = true;
    const ok = rule.subjectIncludesAny.some((s) =>
      subject.includes(s.toLowerCase()),
    );
    if (!ok) return false;
  }
  if (rule.subjectIncludesAll?.length) {
    hasCriteria = true;
    const ok = rule.subjectIncludesAll.every((s) =>
      subject.includes(s.toLowerCase()),
    );
    if (!ok) return false;
  }
  // Empty match criteria never match (avoid accidental catch-all).
  return hasCriteria;
}

/** Extract owner/repo hints from GitHub notification subjects/bodies. */
export function guessRepo(
  subject: string,
  body: string,
): string | undefined {
  const blob = `${subject}\n${body}`;
  const m =
    blob.match(
      /https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/,
    ) ?? blob.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/);
  return m?.[1];
}

export function resolveCwd(
  repo: string | undefined,
  repoRoots: Record<string, string>,
  defaultCwd: string,
): string {
  if (!repo) return defaultCwd;
  const [owner, name] = repo.split("/");
  const exact = repoRoots[repo];
  if (exact) return exact.includes("*") ? defaultCwd : joinRepo(exact, name);
  const ownerStar = repoRoots[`${owner}/*`];
  if (ownerStar) return joinRepo(ownerStar, name);
  const star = repoRoots["*"];
  if (star) return joinRepo(star, repo);
  return defaultCwd;
}

function joinRepo(root: string, leaf: string): string {
  const normalized = root.replace(/[\\/]+$/, "");
  if (leaf.includes("/")) {
    return `${normalized}/${leaf.split("/").pop()}`;
  }
  return `${normalized}/${leaf}`;
}
