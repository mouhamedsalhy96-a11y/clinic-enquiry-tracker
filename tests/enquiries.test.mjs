import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function("exports", "module", compiled)(loaded.exports, loaded);
  return loaded.exports;
}
const model = load("../src/lib/enquiries.ts");
const { demoEnquiries } = load("../src/lib/demo-data.ts");
const valid = { name: "  Jordan Example  ", email: "jordan@example.com", phone: "", category: "Clinic information", contactMethod: "email", message: "Could you explain the clinic registration process?" };

test("validates and normalizes a fictional public enquiry", () => {
  const result = model.validateEnquiry(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Jordan Example");
});
test("requires valid email and rejects oversized messages", () => {
  assert.equal(model.validateEnquiry({ ...valid, email: "invalid" }).ok, false);
  assert.equal(model.validateEnquiry({ ...valid, message: "x".repeat(1501) }).ok, false);
});
test("requires a usable phone number for a callback", () => {
  for (const phone of ["", "-------", "123"]) assert.equal(model.validateEnquiry({ ...valid, contactMethod: "phone", phone }).ok, false);
  assert.equal(model.validateEnquiry({ ...valid, contactMethod: "phone", phone: "+00 1234 567890" }).ok, true);
});
test("rejects unknown categories and contact methods", () => {
  assert.equal(model.validateEnquiry({ ...valid, category: "clinical diagnosis" }).ok, false);
  assert.equal(model.validateEnquiry({ ...valid, contactMethod: "social media" }).ok, false);
});
test("combines search, status, category, and inclusive date filters", () => {
  const result = model.filterEnquiries(demoEnquiries, { ...model.emptyFilter, query: "  ALEX@EXAMPLE.COM  " });
  assert.equal(result.length, 0);
  const filtered = model.filterEnquiries(demoEnquiries, { query: "alex", status: "new", category: "Appointment availability", from: "2026-11-09", to: "2026-11-09" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "demo-1");
});
test("searches references and returns no results for an inverted date range", () => {
  assert.equal(model.filterEnquiries(demoEnquiries, { ...model.emptyFilter, query: "enq-003" })[0].id, "demo-3");
  assert.equal(model.filterEnquiries(demoEnquiries, { ...model.emptyFilter, from: "2026-11-10", to: "2026-11-01" }).length, 0);
});
test("status changes update totals without changing the fixture data", () => {
  const updated = model.changeEnquiryStatus(demoEnquiries, "demo-1", "resolved", "2026-11-09T12:00:00Z");
  assert.deepEqual(model.enquiryCounts(updated), { total: 6, new: 1, inProgress: 2, resolved: 3 });
  assert.equal(demoEnquiries[0].status, "new");
});
test("validates status values instead of silently accepting unknown workflow states", () => {
  assert.throws(() => model.changeEnquiryStatus(demoEnquiries, "demo-1", "invented", "2026-11-09T12:00:00Z"));
});
test("internal notes only update the selected record and preserve the public message", () => {
  const updated = model.appendEnquiryNote(demoEnquiries, "demo-1", { id: "test-note", text: "  Waiting for a follow-up.  ", createdAt: "2026-11-09T12:00:00Z" });
  assert.equal(updated[0].notes[0].text, "Waiting for a follow-up.");
  assert.equal(updated[0].message, demoEnquiries[0].message);
  assert.equal(demoEnquiries[0].notes.length, 0);
  assert.equal(updated[1], demoEnquiries[1]);
});
test("rejects empty or oversized internal notes", () => {
  for (const text of [" ", "x".repeat(1001)]) assert.throws(() => model.appendEnquiryNote(demoEnquiries, "demo-1", { id: "test", text, createdAt: "2026-11-09T12:00:00Z" }));
});
