import fs from "node:fs";
import { processedPath } from "./config.js";

export type ProcessedStore = {
  ids: string[];
};

export function loadProcessed(): Set<string> {
  const p = processedPath();
  if (!fs.existsSync(p)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as ProcessedStore;
    return new Set(data.ids ?? []);
  } catch {
    return new Set();
  }
}

export function markProcessed(ids: Iterable<string>): void {
  const set = loadProcessed();
  for (const id of ids) set.add(id);
  // Cap growth — keep newest 5000
  const idsArr = [...set];
  const trimmed = idsArr.length > 5000 ? idsArr.slice(idsArr.length - 5000) : idsArr;
  fs.writeFileSync(
    processedPath(),
    JSON.stringify({ ids: trimmed }, null, 2),
    "utf8",
  );
}
