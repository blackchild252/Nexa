"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("B319 a Lifestyle alert is sent with its own screen and opens the Lifestyle screen", () => {
  assert.match(read("server/lifestyle.js"), /screen: "leisure_lifestyle", action: "leisure_lifestyle"/);
  assert.match(read("server/notifications.js"), /leisure_lifestyle: "leisure_lifestyle"/);
  assert.match(read("src/pushRouting.ts"), /case "leisure_lifestyle":/);
  assert.match(read("src/pushTapRouting.ts"), /case 'leisure_lifestyle': return '\/lifestyle';/);
  assert.match(read("src/nexaNavigation.ts"), /case 'leisure_lifestyle': return validateNavigationTarget\(\{ pathname: '\/lifestyle' \}\)/);
});

test("B319 the new alert screen routes without changing the existing leisure routes", () => {
  const push = read("src/pushTapRouting.ts");
  assert.match(push, /case 'leisure': return '\/\(tabs\)\/leisure';/);
  assert.match(push, /case 'leisure_kitchen': return '\/leisure\/kitchen';/);
});
