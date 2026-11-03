'use strict';

// Product/company identity is a policy boundary, not a display label.
const COMPANY_IDS = Object.freeze(['nexa', 'lordgistics', 'aami-central', 'admin-aami']);
const PRODUCT_IDS = Object.freeze(['nexa-main', 'lordgistics', 'aami-central-web', 'admin-aami']);
const INDUSTRY_COIN_IDS = Object.freeze(['aami-coin']);
const USER_FACING_TITLES = Object.freeze({
  administrative_director: 'Administrative Director',
  general_manager: 'General Manager',
  group_director: 'Group Director',
  president: 'President',
});
const SAFE_ID = /^[a-z][a-z0-9-]{1,63}$/;

function normalizeIdentity(input = {}) {
  const companyId = typeof input.companyId === 'string' ? input.companyId.trim().toLowerCase() : '';
  const productId = typeof input.productId === 'string' ? input.productId.trim().toLowerCase() : '';
  const industryCoinId = typeof input.industryCoinId === 'string' ? input.industryCoinId.trim().toLowerCase() : '';
  if (!SAFE_ID.test(companyId) || !COMPANY_IDS.includes(companyId)) return { ok: false, error: 'invalid_company_scope' };
  if (!SAFE_ID.test(productId) || !PRODUCT_IDS.includes(productId)) return { ok: false, error: 'invalid_product_scope' };
  if (industryCoinId && (!SAFE_ID.test(industryCoinId) || !INDUSTRY_COIN_IDS.includes(industryCoinId))) return { ok: false, error: 'invalid_industry_coin' };
  const compatible = (companyId === 'nexa' && productId === 'nexa-main')
    || (companyId === 'lordgistics' && productId === 'lordgistics')
    || (companyId === 'aami-central' && productId === 'aami-central-web')
    || (companyId === 'admin-aami' && productId === 'admin-aami');
  if (!compatible) return { ok: false, error: 'company_product_mismatch' };
  return { ok: true, value: { companyId, productId, ...(industryCoinId ? { industryCoinId } : {}) } };
}

// Fail closed: a title or global admin flag alone never grants another company's scope.
function canAccessCompany(actor, companyId) {
  if (!actor || typeof actor !== 'object' || !COMPANY_IDS.includes(companyId)) return false;
  const actorId = typeof actor.companyId === 'string' ? actor.companyId.trim().toLowerCase() : '';
  if (actorId === companyId) return true;
  const memberships = Array.isArray(actor.companyIds) ? actor.companyIds : [];
  return memberships.some((id) => typeof id === 'string' && id.trim().toLowerCase() === companyId);
}

function titleForRole(role) {
  return USER_FACING_TITLES[String(role || '').trim().toLowerCase()] || null;
}

function createCorrelationId(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(candidate)) return candidate;
  return typeof fallback === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(fallback) ? fallback : null;
}

module.exports = { COMPANY_IDS, PRODUCT_IDS, INDUSTRY_COIN_IDS, USER_FACING_TITLES, normalizeIdentity, canAccessCompany, titleForRole, createCorrelationId };
