#!/usr/bin/env node
// Derives the windowed-field table from the three pinned bodies in bodies/.
// No network. The bodies are the raw /api/attest responses as received
// 2026-10-07T17:18:16-20Z (UTC), saved verbatim with their fetch metadata.
//
// The claim this supports: on an incomplete page, identity_log.verified_head is
// the hash the page reached (src/chain.ts:822, report.head), so it moves with
// identity_from exactly while the chain is longer than one page (VERIFY_PAGE,
// src/chain.ts:426) — and it is absent from the hand-authored
// WINDOWED_FIELDS constant served as query_dependence (src/chain.ts:113-139,
// served :859). anchor_mode and anchored_at are literal ternaries on from
// (:851, :852) and are absent too.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const load = (n) => JSON.parse(fs.readFileSync(path.join(dir, "bodies", n + ".json"), "utf8"));
const fields = ["anchor_mode", "anchored_at", "ok", "status", "verified_through_id", "verified_head", "head", "next_from", "total_rows"];
const row = (name, rec) => {
  const l = rec.body.identity_log;
  const vals = fields.map((f) => (f in l ? JSON.stringify(l[f]) : "—"));
  return "| " + name + " | " + vals.join(" | ") + " |";
};
const bare = load("bare"), from100 = load("from100"), cont = load("continuation");
console.log("fetched_at: bare " + bare.fetched_at + ", from100 " + from100.fetched_at + ", continuation " + cont.fetched_at);
console.log("");
console.log("| call | " + fields.join(" | ") + " |");
console.log("|---|" + fields.map(() => "---").join("|") + "|");
console.log(row("bare", bare));
console.log(row("identity_from=100", from100));
console.log(row("continuation (identity_from=20000&expect=row-1 verified_head)", cont));
console.log("");
console.log("tip identical in all three: " + (bare.body.identity_log.head === from100.body.identity_log.head && from100.body.identity_log.head === cont.body.identity_log.head));
console.log("served query_dependence (identical in all three): " + JSON.stringify(bare.body.identity_log.query_dependence));
console.log("");
console.log("bare vs from100 (both incomplete, same tip):");
for (const f of new Set([...Object.keys(bare.body.identity_log), ...Object.keys(from100.body.identity_log)])) {
  const a = JSON.stringify(bare.body.identity_log[f] ?? null), b = JSON.stringify(from100.body.identity_log[f] ?? null);
  if (a !== b) console.log("  " + f + ": bare=" + a + "  from100=" + b);
}
console.log("");
console.log("declared in query_dependence?");
for (const f of ["anchor_mode", "anchored_at", "verified_head", "anchor_resolved_id", "anchor_resolved_as_requested", "ok", "status", "verified_through_id"]) {
  console.log("  " + f + ": " + (bare.body.identity_log.query_dependence.includes(f) ? "yes" : "NO") + "  (moved between bare and from100: " + (JSON.stringify(bare.body.identity_log[f] ?? null) !== JSON.stringify(from100.body.identity_log[f] ?? null)) + ")");
}
