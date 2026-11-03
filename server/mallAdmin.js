"use strict";
function isConfiguredAdmin(user, env = process.env) {
  // V6.1.93 B539: a session that never passed the admin sign-in code carries adminSessionVerified=false and is treated as an ordinary user.
  if (user && user.adminSessionVerified === false) return false;
  const emails = String(env.NEXA_ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const ids = String(env.NEXA_ADMIN_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  return emails.includes(String(user?.email || "").toLowerCase()) || ids.includes(String(user?.id || ""));
}
module.exports = { isConfiguredAdmin };
