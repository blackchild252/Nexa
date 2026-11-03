'use strict';
const crypto = require('node:crypto');

const SECRET_KEYS = Object.freeze([
  'PAYSTACK_SECRET_KEY', 'FLUTTERWAVE_SECRET_KEY', 'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY', 'XAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_CLIENT_SECRET',
  'SENTRY_AUTH_TOKEN', 'NEXA_TURN_CREDENTIAL', 'NEXA_BOOTSTRAP_ADMIN_PASSWORD',
  'SMTP_PASSWORD', 'EMAIL_API_KEY', 'SMS_API_KEY', 'TWILIO_AUTH_TOKEN',
  'STORAGE_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'WEBHOOK_SECRET', 'NEXA_WALLET_WEBHOOK_SECRET',
  'IDENTITY_PROVIDER_SECRET', 'OAUTH_CLIENT_SECRET', 'JWT_SECRET',
]);

const SECRET_PLACEHOLDER = /^(?:your[_ -]?(?:key|secret|password|token)(?:[_ -]?here)?|change[_ -]?me|replace[_ -]?me|placeholder|<[^>]+>|example(?:[_ -].*)?)$/i;
const value = (env, key) => String(env?.[key] ?? '').trim();
const isPlaceholder = (v) => !v || SECRET_PLACEHOLDER.test(v);
const isUrl = (v, protocols = ['https:']) => {
  try { const u = new URL(v); return protocols.includes(u.protocol) && Boolean(u.hostname); }
  catch { return false; }
};

function inspectConfiguration(env = process.env) {
  const production = value(env, 'NODE_ENV').toLowerCase() === 'production';
  const paymentLive = value(env, 'PAYMENT_MODE').toLowerCase() !== 'mock' && value(env, 'PAYMENTS_ENABLED').toLowerCase() === 'true';
  const fields = [
    { key: 'DB_PATH', required: production, valid: Boolean(value(env, 'DB_PATH')), remediation: 'Set DB_PATH to a persistent writable database path.' },
    { key: 'PUBLIC_URL', required: production, valid: isUrl(value(env, 'PUBLIC_URL')), remediation: 'Set PUBLIC_URL to the canonical public HTTPS API URL.' },
    { key: 'CORS_ORIGINS', required: production, valid: Boolean(value(env, 'CORS_ORIGINS')) && !value(env, 'CORS_ORIGINS').split(',').some(x => x.trim() === '*'), remediation: 'Set CORS_ORIGINS to explicit trusted HTTPS origins; do not use *.' },
    ...SECRET_KEYS.map(key => ({ key, secret: true, required: key === 'PAYSTACK_SECRET_KEY' && paymentLive, valid: !isPlaceholder(value(env, key)), remediation: `Supply ${key} through the deployment secret manager when its integration is enabled.` })),
  ].map(field => ({ ...field, configured: Boolean(value(env, field.key)), valid: Boolean(field.valid), status: field.valid ? 'configured' : (field.configured ? 'placeholder_or_invalid' : 'missing') }));
  const blockers = fields.filter(f => f.required && !f.valid).map(f => f.key);
  return Object.freeze({ environment: production ? 'production' : (value(env, 'NODE_ENV') || 'development'), ready: blockers.length === 0, blockers, fields });
}

function safeReadinessSummary(result) {
  const blockers = result.blockers.length ? result.blockers.join(', ') : 'none';
  const counts = result.fields.reduce((a, f) => { a[f.status] = (a[f.status] || 0) + 1; return a; }, {});
  return `[NEXA] configuration readiness: ${result.ready ? 'READY' : 'BLOCKED'}; environment=${result.environment}; missing_or_invalid_required=${blockers}; configured=${counts.configured || 0}; placeholders_or_invalid=${counts.placeholder_or_invalid || 0}; missing_optional=${counts.missing || 0}`;
}

function createProviderAdapter({ name, envKey, env = process.env, invoke = null } = {}) {
  const provider = String(name || envKey || 'external-provider');
  const configured = Boolean(envKey && !isPlaceholder(value(env, envKey)));
  return Object.freeze({
    provider,
    configured,
    async execute(...args) {
      if (!configured) return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', provider };
      if (typeof invoke !== 'function') return { ok: false, code: 'PROVIDER_ADAPTER_UNAVAILABLE', provider };
      return invoke(...args);
    },
  });
}

function verifyWebhookSignature({ rawBody, signature, secret, algorithm = 'sha256' } = {}) {
  const key = String(secret || '');
  const supplied = String(signature || '').replace(/^sha256=/i, '').trim();
  if (!key || isPlaceholder(key) || !supplied || !rawBody) return false;
  const expected = crypto.createHmac(algorithm, key).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(supplied, 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function redactSecrets(input, env = process.env) {
  let output = String(input ?? '');
  for (const key of SECRET_KEYS) {
    const secret = value(env, key);
    if (secret && !isPlaceholder(secret)) output = output.split(secret).join('[REDACTED]');
  }
  return output
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|client[_-]?secret|webhook[_-]?secret|access[_-]?token|refresh[_-]?token|password)\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

module.exports = { SECRET_KEYS, inspectConfiguration, safeReadinessSummary, redactSecrets, isPlaceholder, isUrl, createProviderAdapter, verifyWebhookSignature };
