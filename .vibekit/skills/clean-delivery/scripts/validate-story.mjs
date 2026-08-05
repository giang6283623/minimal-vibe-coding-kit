#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const storyPath = process.argv[2];

if (!storyPath) {
  console.error("Usage: validate-story.mjs <story.md>");
  process.exit(2);
}

const absolutePath = path.resolve(storyPath);
let source;
try {
  source = fs.readFileSync(absolutePath, "utf8");
} catch (error) {
  console.error("ERROR: cannot read story: " + error.message);
  process.exit(2);
}

const requiredSections = [
  "Behavior",
  "In scope",
  "Acceptance criteria",
  "Out of scope",
  "Editable paths",
  "Protected verifier assets",
  "Red evidence",
  "Proof commands",
  "Risk",
];

const errors = [];
if (!/^#\s+STORY-[A-Za-z0-9._-]+:\s+\S/.test(source)) {
  errors.push("story title must match '# STORY-<id>: <observable outcome>'");
}

const headings = [...source.matchAll(/^##\s+(.+?)\s*$/gm)];
const sections = new Map();
const duplicateSections = new Set();
for (let index = 0; index < headings.length; index += 1) {
  const name = headings[index][1].trim().toLowerCase();
  const start = headings[index].index + headings[index][0].length;
  const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
  if (sections.has(name)) duplicateSections.add(name);
  else sections.set(name, source.slice(start, end).trim());
}

for (const sectionName of requiredSections) {
  const key = sectionName.toLowerCase();
  const content = sections.get(key);
  if (!content) errors.push("missing or empty section: " + sectionName);
  if (duplicateSections.has(key)) errors.push("duplicate section: " + sectionName);
}

const sourceLower = source.toLowerCase();
for (const placeholder of [
  "Short observable outcome",
  "Describe what a user or external caller can observe.",
  "One bounded change.",
  "Expected: state the observable result and important failure behavior.",
  "State one nearby concern that will not change.",
  "path/to/edit",
  "path/to/test-or-validator",
  "exact command",
  "specific failure caused by the missing behavior",
  "not-configured: reason",
]) {
  if (sourceLower.includes(placeholder.toLowerCase())) {
    errors.push("template placeholder remains: " + placeholder);
  }
}

for (const sectionName of ["In scope", "Out of scope", "Editable paths", "Protected verifier assets"]) {
  const content = sections.get(sectionName.toLowerCase()) || "";
  if (!/^[-*]\s+\S/m.test(content)) errors.push(sectionName + " must contain a non-empty list item");
}

const acceptance = sections.get("acceptance criteria") || "";
const hasGherkin = /\bGiven\b/i.test(acceptance) && /\bWhen\b/i.test(acceptance) && /\bThen\b/i.test(acceptance);
if (!hasGherkin && !/^[-*]\s+\S/m.test(acceptance)) {
  errors.push("Acceptance criteria must contain a bullet or a Given/When/Then scenario");
}

const redEvidence = sections.get("red evidence") || "";
for (const field of ["Command", "Expected failure"]) {
  const match = redEvidence.match(new RegExp("^" + field + ":\\s*(.+)$", "im"));
  if (!match || /^(?:TBD|none|null|exact command|not-configured\s*:)/i.test(match[1].trim())) {
    errors.push("Red evidence requires " + field + ": with a concrete value");
  }
}

const proofCommands = sections.get("proof commands") || "";
for (const field of ["Unit", "Acceptance", "Architecture", "Property", "Mutation", "E2E"]) {
  const match = proofCommands.match(new RegExp("^" + field + ":\\s*(.+)$", "im"));
  if (!match || /^(?:TBD|none|null|exact command(?: or not-configured: reason)?|not-configured:\s*reason)$/i.test(match[1].trim())) {
    errors.push("Proof commands requires " + field + ": with a command or 'not-configured: reason'");
  }
}

const unit = proofCommands.match(/^Unit:\s*(.+)$/im)?.[1].trim() || "";
if (/^not-configured:/i.test(unit)) {
  errors.push("Unit proof must name an executable deterministic check");
}

const risk = (sections.get("risk") || "").replace(/[*_]/g, "").trim().toLowerCase();
if (!new Set(["low", "medium", "high", "critical"]).has(risk)) {
  errors.push("Risk must be exactly low, medium, high, or critical");
}

if (errors.length > 0) {
  for (const error of errors) console.error("ERROR: " + error);
  process.exit(1);
}

console.log("VALID: " + path.basename(absolutePath) + " satisfies the Clean Delivery story contract");
