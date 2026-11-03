"use strict";

function clientRuntimeReadiness({ lockfilePresent=false, dependenciesInstalled=false, playwrightInstalled=false, androidRuntimeValidated=false } = {}) {
  const blockers = [];
  if (!lockfilePresent) blockers.push("missing_root_lockfile");
  if (!dependenciesInstalled) blockers.push("dependencies_not_installed");
  if (!playwrightInstalled) blockers.push("playwright_not_available");
  if (!androidRuntimeValidated) blockers.push("android_runtime_not_validated");
  return { ready: blockers.length === 0, blockers };
}
module.exports = { clientRuntimeReadiness };
