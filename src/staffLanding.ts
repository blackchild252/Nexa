// Where a signed-in staff member lands (M7774, client side). Plain data only: no React, no network.
// The place comes from the server's door answer (section and unit), looked up in a fixed list here. A path,
// url or route sent by anyone is never followed. A place with no screen yet returns null, and the caller
// shows the same one door refusal as every other failure.

export type StaffLandingSection = "vendor-shop" | "manager-section";

// Only screens that exist today. Business Hub staff work for a vendor; Kitchen and Blaca Essentials staff work under a Manager.
// Blaca Essentials has no staff screen yet, so it is not listed.
export const STAFF_LANDING_ROUTES: Readonly<Record<StaffLandingSection, Readonly<Record<string, string>>>> = Object.freeze({
  "vendor-shop": Object.freeze({ "business-hub": "/marketplace/vendor" }),
  "manager-section": Object.freeze({ kitchen: "/leisure/kitchen" }),
});

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function staffLandingRoute(door: unknown): string | null {
  if (!door || typeof door !== "object") return null;
  const dest = (door as { destination?: unknown }).destination;
  if (!dest || typeof dest !== "object") return null;
  const d = dest as { section?: unknown; unit?: unknown };
  if (typeof d.section !== "string" || !has(STAFF_LANDING_ROUTES, d.section)) return null;
  const units = STAFF_LANDING_ROUTES[d.section as StaffLandingSection];
  if (typeof d.unit !== "string" || !has(units, d.unit)) return null;
  return units[d.unit];
}
