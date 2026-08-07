/** Injected at build/CI time when available; fallback for local `tsx` runs. */
export const VERSION = process.env.AEI_VERSION ?? "0.1.0";
export const BUILD_ID =
  process.env.AEI_BUILD_ID ??
  process.env.GITHUB_SHA?.slice(0, 12) ??
  "local";
export const CHANNEL = process.env.AEI_CHANNEL ?? "dev";

export function versionLine(): string {
  return `aei ${VERSION} (${CHANNEL}+${BUILD_ID})`;
}
