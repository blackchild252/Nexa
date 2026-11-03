'use strict';

// Admin authority bootstrap. The password is supplied only through the server environment,
// hashed immediately, and never shipped to the Admin web client.
function ensureBootstrapAdmin({ db, auth, admin, env = process.env } = {}) {
  const email = String(env.NEXA_BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.NEXA_BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!email || !password) return { configured: false };
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('NEXA_BOOTSTRAP_ADMIN_EMAIL must be a valid email.');
  if (password.length < 8) throw new Error('NEXA_BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');

  let user = db.prepare('SELECT id,email,passwordHash,accountStatus FROM users WHERE lower(email)=?').get(email);
  const now = new Date().toISOString();
  if (!user) {
    const id = admin.newId();
    const passwordHash = auth.hashPasswordSync(password);
    db.prepare('INSERT INTO users(id,email,passwordHash,name,createdAt,accountStatus,adultConfirmedAt) VALUES(?,?,?,?,?,?,?)')
      .run(id, email, passwordHash, 'NEXA Owner', now, 'active', now);
    user = { id, email, accountStatus: 'active' };
  }
  if (user.accountStatus === 'closed') throw new Error('The bootstrap Admin account is closed.');
  db.prepare('INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?) ON CONFLICT(userId) DO UPDATE SET role=excluded.role')
    .run(user.id, 'owner', user.id, now);
  const configured = String(env.NEXA_ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!configured.includes(email)) env.NEXA_ADMIN_EMAILS = [...configured, email].join(',');
  return { configured: true, userId: user.id, email };
}

module.exports = { ensureBootstrapAdmin };
