'use strict';

const MAX_ID_LENGTH = 80;
const PUBLIC_CACHE_CONTROL = 'public, max-age=300, must-revalidate';
const PRIVATE_CACHE_CONTROL = 'no-store';

function normalizeId(value) {
  const id = String(value == null ? '' : value).trim();
  return id.length > 0 && id.length <= MAX_ID_LENGTH ? id : null;
}

function publicProductQuery(id) {
  const normalized = normalizeId(id);
  if (!normalized) return null;
  return { id: normalized, where: 'p.id = ? AND p.active = 1 AND COALESCE(v.status, \'active\') = \'active\'' };
}

function publicVendorQuery(id) {
  const normalized = normalizeId(id);
  if (!normalized) return null;
  return { id: normalized, where: "v.id = ? AND COALESCE(v.status, 'active') = 'active'" };
}

function publicImageHeaders({ publicListing }) {
  return {
    'Cache-Control': publicListing ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL,
    'X-Content-Type-Options': 'nosniff',
  };
}

function visibilityContract() {
  return {
    activeProductRequired: true,
    activeVendorRequired: true,
    boundedIds: true,
    retiredAssetsNotPublic: true,
    mutableAssetCache: true,
    noStoreForNonPublic: true,
  };
}

module.exports = { MAX_ID_LENGTH, PUBLIC_CACHE_CONTROL, PRIVATE_CACHE_CONTROL, normalizeId, publicProductQuery, publicVendorQuery, publicImageHeaders, visibilityContract };
