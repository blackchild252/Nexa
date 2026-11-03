"use strict";

const DOMAINS = Object.freeze({
  identity: { owner: "auth/account lifecycle", boundaries: ["auth.js", "accountLifecycle.js", "accountPortability.js"] },
  money: { owner: "Sky Money", boundaries: ["wallet.js", "subscriptions.js", "storeAjo.js"] },
  social: { owner: "Zeeza", boundaries: ["friends.js", "chat.js", "rooms.js"] },
  marketplace: { owner: "Dream Marketplace", boundaries: ["mall.js", "mallAdmin.js", "payments.js"] },
  community: { owner: "Yaayz", boundaries: ["yaayz.js"] },
  leisure: { owner: "L.A.", boundaries: ["leisureArena.js", "kitchen.js"] },
  intelligence: { owner: "Dami / AI", boundaries: ["aiHub.js", "aiActions.js", "intelligence.js"] },
  platform: { owner: "Extensions / Operations", boundaries: ["extensions.js", "operationalReadiness.js", "eventCorrelation.js"] },
});

function getDomain(name) { return DOMAINS[String(name || "").trim()] || null; }
function listDomains() { return Object.entries(DOMAINS).map(([id, value]) => ({ id, ...value })); }

module.exports = { DOMAINS, getDomain, listDomains };
