"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateLaunchReadiness } = require("./launchReadiness");
const productionIntegrity = require("./v5_66_0_production_integrity");

const read = (root, file) => { try { return fs.readFileSync(path.join(root, file), "utf8"); } catch (_) { return ""; } };
const json = (root, file) => { try { return JSON.parse(read(root, file)); } catch (_) { return null; } };
const prod = (env = {}) => String(env.NODE_ENV || "").trim().toLowerCase() === "production";
const val = (env, key) => String(env?.[key] ?? "").trim();

const B137_MILESTONES = Object.freeze([
  [1750, "canonical production launch state"],
  [1751, "strict launch enforcement integrity"],
  [1752, "launch certification state integrity"],
  [1753, "production configuration completeness"],
  [1754, "production database path safety"],
  [1755, "database persistence and startup integrity"],
  [1756, "production authentication configuration"],
  [1757, "Google OAuth production integrity"],
  [1758, "AI provider/key coherence"],
  [1759, "Google/Gemini SDK configuration integrity"],
  [1760, "payment production configuration"],
  [1761, "wallet production configuration"],
  [1762, "webhook security and signature enforcement"],
  [1763, "CORS/public-origin production boundary"],
  [1764, "HTTPS/external callback integrity"],
  [1765, "backup freshness and recovery readiness"],
  [1766, "notification/call infrastructure readiness"],
  [1767, "Sentry/operational monitoring readiness"],
  [1768, "preview/fixture/test-mode exclusion"],
  [1769, "AdMob/Yaayz production configuration boundary"],
  [1770, "release/version/lockfile/Expo synchronization"],
  [1771, "production dependency and startup integrity"],
  [1772, "full launch-readiness cumulative contract"],
  [1773, "B137 hostile production-readiness audit"],
  [1774, "V5.96.0 release certification and permanent seal"],
]);

function staticChecks(root) {
  const app = json(root, "app.json");
  const pkg = json(root, "package.json");
  const yaayz = read(root, "src/YaayzScreen.tsx");
  const yaayzAd = read(root, "src/YaayzNativeAd.tsx");
  const googleSdk = read(root, "server/geminiProvider.js");
  const notifications = read(root, "server/notifications.js");
  const calls = read(root, "server/callSignaling.js") + read(root, "server/groupCallSignaling.js");
  const admobPlugin = Array.isArray(app?.expo?.plugins) && app.expo.plugins.some((p) => Array.isArray(p) && p[0] === "react-native-google-mobile-ads" && Boolean(p[1]?.androidAppId) && Boolean(p[1]?.iosAppId));
  const hasAdUnitBoundary = /AdMob|adUnit|adUnitId|mobile-ads/i.test(yaayzAd);
  const googleDependency = Boolean(pkg?.dependencies?.["@google/genai"] && /GEMINI_API_KEY|GOOGLE_API_KEY/.test(googleSdk));
  return {
    admob: { ok: admobPlugin && hasAdUnitBoundary, detail: admobPlugin && hasAdUnitBoundary ? "Yaayz AdMob plugin and native ad boundary present" : "Yaayz AdMob production boundary missing" },
    yaayz: { ok: /Yaayz|yaayz/i.test(yaayz) && hasAdUnitBoundary, detail: /Yaayz|yaayz/i.test(yaayz) && hasAdUnitBoundary ? "Yaayz production surface present" : "Yaayz production surface missing" },
    googleSdk: { ok: googleDependency, detail: googleDependency ? "Google GenAI SDK/provider boundary present" : "Google GenAI SDK/provider boundary missing" },
    notifications: { ok: /notification/i.test(notifications) && /userId/i.test(notifications), detail: /notification/i.test(notifications) && /userId/i.test(notifications) ? "notification ownership/delivery source present" : "notification source boundary missing" },
    calls: { ok: /userId|session|room/i.test(calls) && /signaling/i.test(calls), detail: /userId|session|room/i.test(calls) && /signaling/i.test(calls) ? "call signaling sources present" : "call signaling source boundary missing" },
  };
}

function evaluateProductionCertification({ env = process.env, root = process.cwd(), packageVersion } = {}) {
  const production = prod(env);
  const resolvedPackageVersion = packageVersion || json(root, "package.json")?.version;
  const launch = evaluateLaunchReadiness({ env, packageVersion: resolvedPackageVersion });
  const integrity = productionIntegrity.evaluate({ env, root });
  const statics = staticChecks(root);
  const staticList = Object.entries(statics).map(([id, result]) => ({ id, ...result }));
  const failures = [];
  if (!production) failures.push("production-mode-required");
  if (production && val(env, "NEXA_STRICT_LAUNCH") !== "1") failures.push("strict-launch-required");
  if (production && val(env, "NEXA_LAUNCH_CERTIFIED") !== "1") failures.push("launch-certification-required");
  for (const check of launch.checks) if (production && ["fail", "warn"].includes(check.status)) failures.push(`launch:${check.id}`);
  for (const check of integrity.checks) if (!check.ok) failures.push(`integrity:${check.milestone}`);
  for (const check of staticList) if (!check.ok) failures.push(`static:${check.id}`);
  const safeLaunch = { total: launch.total, pass: launch.pass, warn: launch.warn, fail: launch.fail, skip: launch.skip, ok: launch.ok };
  return {
    production,
    certified: production && val(env, "NEXA_LAUNCH_CERTIFIED") === "1",
    total: launch.total + integrity.total + staticList.length + 3,
    ok: failures.length === 0,
    shouldBlockStart: production && failures.length > 0,
    failures,
    launch: safeLaunch,
    integrity: { total: integrity.total, pass: integrity.pass, fail: integrity.fail, ok: integrity.ok },
    staticChecks: statics,
  };
}

module.exports = { B137_MILESTONES, evaluateProductionCertification, staticChecks };
