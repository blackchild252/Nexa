import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_KEYS = Object.freeze([
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_PRIVACY_POLICY_URL',
  'EXPO_PUBLIC_TERMS_URL',
]);

const URL_KEYS = Object.freeze(PUBLIC_KEYS);
const SECRET_KEYS = Object.freeze([
  'PAYSTACK_SECRET_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'GOOGLE_CLIENT_SECRET', 'SENTRY_AUTH_TOKEN', 'NEXA_TURN_CREDENTIAL',
]);

const value = (env, key) => String(env?.[key] ?? '').trim();
const isHttpsUrl = (raw) => {
  try {
    const u = new URL(String(raw));
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch { return false; }
};

function inspectProductionEnvironment(env = process.env) {
  const checks = [];
  for (const key of PUBLIC_KEYS) {
    const v = value(env, key);
    checks.push({ id: `public.${key}`, key, required: true, configured: Boolean(v), valid: Boolean(v) && isHttpsUrl(v), remediation: `eas env:create --environment production --name ${key} --value <YOUR_HTTPS_URL>` });
  }
  for (const key of SECRET_KEYS) {
    checks.push({ id: `secret.${key}`, key, required: false, configured: Boolean(value(env, key)), valid: true });
  }
  const blockers = checks.filter(c => c.required && !c.valid).map(c => c.key);
  return { production: String(env?.NODE_ENV || '').toLowerCase() === 'production', checks, blockers, ok: blockers.length === 0 };
}

function renderSafeSummary(result) {
  return result.checks.map(c => `${c.valid ? 'PASS' : 'BLOCKER'} ${c.id}${c.required ? ' required' : ' optional'}`).join('\n');
}

export { PUBLIC_KEYS, URL_KEYS, SECRET_KEYS, inspectProductionEnvironment, renderSafeSummary, isHttpsUrl };
