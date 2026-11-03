// Who is an Administrative Director in NEXA Main (M7780/M7786). Main already stores verified Admin AAMI grants in
// admin_aami_privileged_access (written only by signed Central events). A Director here is a NEXA account with an
// ACTIVE, activation-confirmed grant for company "nexa", product "admin-aami", role "administrative_director".
// General Manager and Group Director are NOT Directors for staff approval. Anything unclear resolves to nobody.
// This module only reads; it never writes a grant and never trusts the request body.
"use strict";

const str = (v, max = 128) => typeof v === "string" && v.trim() !== "" && v.length <= max;

function createStaffDirectors(db) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("A database adapter is required.");
  function directorFor(nexaUserId) {
    if (!str(nexaUserId)) return null;
    try {
      const g = db.prepare("SELECT applicationId FROM admin_aami_privileged_access WHERE targetUserId = ? AND companyId = 'nexa' AND productId = 'admin-aami' AND role = 'administrative_director' AND status = 'active' AND activationConfirmed = 1 LIMIT 1").get(nexaUserId);
      return g ? { id: nexaUserId, tier: "director" } : null;
    } catch (_) { return null; } // table missing or unreadable: fail closed
  }
  return { directorFor };
}
module.exports = { createStaffDirectors };
