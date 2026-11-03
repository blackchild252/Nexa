#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const sourceDir = path.resolve(process.argv[3] || path.join(root, "branding"));
const assetDir = path.resolve(process.argv[4] || path.join(root, "assets", "branding"));
const sources = { png: path.join(sourceDir, "NEXA_permanent_logo.png"), svg: path.join(sourceDir, "NEXA_permanent_logo.svg") };
for (const [kind, file] of Object.entries(sources)) {
  if (!fs.existsSync(file)) throw new Error(`Missing NEXA ${kind} logo: ${file}`);
}
fs.mkdirSync(assetDir, { recursive: true });
const targets = { png: path.join(assetDir, "nexa-logo.png"), svg: path.join(assetDir, "nexa-logo.svg") };
for (const [kind, target] of Object.entries(targets)) {
  const source = sources[kind];
  const same = fs.existsSync(target) && fs.readFileSync(source).equals(fs.readFileSync(target));
  if (same) console.log(`NEXA ${kind} logo already installed: ${target}`);
  else { fs.copyFileSync(source, target); console.log(`Installed NEXA ${kind} logo: ${target}`); }
}
console.log("");
console.log("NEXA branding assets installed locally.");
console.log("Existing app branding should reference assets/branding/nexa-logo.* through the central brand source.");
