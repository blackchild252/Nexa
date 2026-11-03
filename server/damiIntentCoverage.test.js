"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

const intents = ["general","shopping","price_watch","scamcheck","money","iou","content","split","mall"];
const fixtures = [
  ["find the cheapest top in the Mall", "mall"],
  ["where is my order", "mall"],
  ["how much did I spend on food", "money"],
  ["Kunle owes me 5000", "iou"],
  ["split 24k dinner with Tolu and Ade", "split"],
  ["is this payment message a scam", "scamcheck"],
  ["write a caption for my new shop", "content"],
  ["watch the price of iPhone 16", "price_watch"],
  ["show me something", "general"],
];
test("Dami prompt explicitly covers every supported intent", () => {
  for (const intent of intents) assert.match(source, new RegExp(`- ${intent}\\s+→`), `${intent} missing from Dami intent contract`);
});
test("Dami intent fixtures cover commerce, money, social-risk and content paths", () => {
  assert.equal(new Set(fixtures.map(([,i])=>i)).size, 8);
  for (const [,intent] of fixtures) assert.ok(intents.includes(intent));
});
test("consequential actions remain confirmation-gated", () => {
  assert.match(source, /Preparing an action is NOT executing it/);
  assert.match(source, /Never propose money transfer, payment, checkout, purchase/);
});
