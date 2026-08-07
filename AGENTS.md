# Agentic Email Integration

## Product thesis

Own-your-inbox **integration** — not disposable AgentMail inboxes. Mail plane = Himalaya (+ token broker). Agent plane = `@cursor/sdk` local. Default write path = Gmail **drafts only**.

## Layout

- `src/` — TypeScript CLI (`aei`)
- `docs/` — Antora component `agentic-email-integration`
- Portal wiring lives in `dev-centr/docs` playbooks + `tools/agentic-email-integration.adoc`

## Essentials

- `--version` includes build id (`AEI_BUILD_ID` / `GITHUB_SHA`)
- `aei doctor` writes a redacted dump under `%APPDATA%/agentic-email-integration`
- Config is JSON5 (`config.example.json5`)
- Changelog: `CHANGELOG.adoc` + `changelog-details/`

## Agent ops

Prefer shelling `himalaya` for mailbox work. Do not invent a second Gmail OAuth client inside this repo unless Himalaya cannot cover the need.
