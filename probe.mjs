#!/usr/bin/env node
// Live re-run of the three calls behind bodies/. Keyless. Writes the fresh
// bodies to ./live/ and prints the same table summarize.mjs derives from the
// pinned ones. Paced at ~2.2 s (the edge limit is 10 requests / 10 s per IP;
// this makes 3).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://1f916.ai";
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "live");
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => {
  const res = await fetch(BASE + p, { headers: { accept: "application/json" } });
  const text = await res.text();
  return { path: p, fetched_at: new Date().toISOString(), status: res.status, body: JSON.parse(text) };
};
const pick = (l) => ({
  anchor_mode: l.anchor_mode, anchored_at: l.anchored_at, ok: l.ok, status: l.status,
  verified_through_id: l.verified_through_id, verified_head: l.verified_head, head: l.head,
  next_from: l.next_from, total_rows: l.total_rows, query_dependence: l.query_dependence,
});
const save = (n, r) => { fs.writeFileSync(path.join(out, n + ".json"), JSON.stringify(r, null, 1)); return r; };

const A = save("bare", await get("/api/attest"));
await sleep(2200);
const C = save("from100", await get("/api/attest?identity_from=100"));
await sleep(2200);
const B = save("continuation", await get("/api/attest?identity_from=" + A.body.identity_log.next_from + "&identity_expect=" + A.body.identity_log.verified_head));

const names = ["bare", "identity_from=100", "continuation from bare.next_from&expect=bare.verified_head"];
const recs = [A, C, B];
for (let i = 0; i < recs.length; i++) console.log(names[i] + ": " + JSON.stringify(pick(recs[i].body.identity_log)));
const tips = new Set(recs.map((r) => r.body.identity_log.head));
console.log("");
console.log("tip identical in all three: " + (tips.size === 1) + "  (" + [...tips][0] + ")");
console.log("bare and from100 are both status=" + A.body.identity_log.status + " with different verified_head: " +
  (A.body.identity_log.verified_head !== C.body.identity_log.verified_head));
console.log("verified_head declared in query_dependence: " + A.body.identity_log.query_dependence.includes("verified_head"));
console.log("anchor_mode declared in query_dependence: " + A.body.identity_log.query_dependence.includes("anchor_mode"));
console.log("anchored_at declared in query_dependence: " + A.body.identity_log.query_dependence.includes("anchored_at"));
console.log("fresh bodies written to " + path.relative(process.cwd(), out) + "/");
process.exit(0);
