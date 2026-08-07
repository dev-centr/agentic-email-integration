import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AppConfig } from "../config.js";
import type { Envelope } from "../mail/himalaya.js";
import type { Rule } from "../config.js";

export type TriggerResult = {
  status: "finished" | "error" | "cancelled" | "skipped";
  agentId?: string;
  runId?: string;
  resultText?: string;
  error?: string;
};

export function buildPrompt(input: {
  rule: Rule;
  envelope: Envelope;
  body: string;
  cwd: string;
  safety: AppConfig["safety"];
}): string {
  const draftOnly =
    input.safety.createDraftOnly || input.safety.neverAutoSend
      ? `
## Safety (mandatory)
- Create a Gmail **draft** only. Do **not** send mail.
- Prefer the Himalaya CLI for all mailbox operations (\`himalaya --help\`).
- Never print OAuth tokens, app passwords, or raw credentials.
`
      : "";

  if (input.rule.action === "investigate-ci") {
    return `You are handling a CI / checks notification that arrived in the user's owned Gmail inbox.

Working directory for repo work: ${input.cwd}

## Email
- From: ${input.envelope.from}
- Subject: ${input.envelope.subject}
- Date: ${input.envelope.date}
- Id: ${input.envelope.id}

## Body
${input.body}

## Task
1. Identify the failing workflow / check and repository.
2. Investigate using \`gh\` and the local checkout when present.
3. Summarize root cause and a concrete fix plan.
4. If a reply to the notification thread or collaborators is useful, draft it with Himalaya as a **draft** (do not send).
5. Leave a short status note the user can paste into chat or a PR comment.
${draftOnly}`;
  }

  return `You are drafting a reply to developer correspondence in the user's owned Gmail inbox (integration — not a disposable agent mailbox).

Working directory (context): ${input.cwd}

## Email
- From: ${input.envelope.from}
- Subject: ${input.envelope.subject}
- Date: ${input.envelope.date}
- Id: ${input.envelope.id}

## Body
${input.body}

## Task
1. Read the thread context with Himalaya if needed (\`himalaya message read ${input.envelope.id}\`).
2. Draft a professional, concise reply aligned with the user's projects.
3. Save it as a Gmail **draft** via Himalaya (do not send).
4. Report the draft id / how to review it.
${draftOnly}`;
}

export async function runCursorAgent(input: {
  config: AppConfig;
  prompt: string;
  cwd: string;
  dryRun?: boolean;
}): Promise<TriggerResult> {
  if (input.dryRun) {
    return {
      status: "skipped",
      resultText: `[dry-run] would start Cursor agent in ${input.cwd}\n\n${input.prompt}`,
    };
  }

  const apiKey = process.env[input.config.cursor.apiKeyEnv];
  if (!apiKey) {
    return {
      status: "error",
      error: `Missing ${input.config.cursor.apiKeyEnv}. Set it or copy .env.example.`,
    };
  }

  try {
    const result = await Agent.prompt(input.prompt, {
      apiKey,
      model: { id: input.config.cursor.model },
      local: { cwd: input.cwd },
    });
    return {
      status: result.status,
      runId: result.id,
      resultText: result.result,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        status: "error",
        error: `${err.message} (retryable=${err.isRetryable})`,
      };
    }
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
