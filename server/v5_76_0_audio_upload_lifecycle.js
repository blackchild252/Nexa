'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DEFAULT_MAX_FILE_BYTES = 12 * 1024 * 1024;
const DEFAULT_MAX_STORAGE_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_SWEEP_MS = 5 * 60 * 1000;
const MAX_SWEEP_ENTRIES = 2000;
const NAME_RE = /^nexa-voice-[a-f0-9]{32}\.(m4a|mp3|mp4|mpeg|mpga|wav|webm|ogg|oga|flac|aac|caf|3gp)$/;

function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

function createAudioUploadPolicy(env = process.env) {
  return Object.freeze({
    rootDir: path.resolve(String(env.NEXA_AUDIO_TMP_DIR || path.join(os.tmpdir(), 'nexa-voice'))),
    maxFileBytes: positiveInt(env.NEXA_AUDIO_MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES),
    maxStorageBytes: positiveInt(env.NEXA_AUDIO_MAX_STORAGE_BYTES, DEFAULT_MAX_STORAGE_BYTES, 1024 * 1024 * 1024),
    maxAgeMs: positiveInt(env.NEXA_AUDIO_MAX_AGE_MS, DEFAULT_MAX_AGE_MS, 24 * 60 * 60 * 1000),
    sweepMs: positiveInt(env.NEXA_AUDIO_SWEEP_MS, DEFAULT_SWEEP_MS, 60 * 60 * 1000),
  });
}

function ensureRoot(policy) {
  fs.mkdirSync(policy.rootDir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(policy.rootDir, 0o700); } catch (_) {}
}

function isInsideRoot(rootDir, target) {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(target);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function safePath(policy, filePath) {
  const target = path.resolve(String(filePath || ''));
  if (!isInsideRoot(policy.rootDir, target)) throw new Error('audio upload path is outside the managed directory');
  if (!NAME_RE.test(path.basename(target))) throw new Error('audio upload path is not a managed file');
  return target;
}

function managedFilename(originalName = '') {
  const ext = path.extname(String(originalName)).toLowerCase();
  const allowed = new Set(['.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.wav', '.webm', '.ogg', '.oga', '.flac', '.aac', '.caf', '.3gp']);
  const suffix = allowed.has(ext) ? ext : '.m4a';
  return `nexa-voice-${crypto.randomBytes(16).toString('hex')}${suffix}`;
}

function directoryUsage(policy) {
  ensureRoot(policy);
  let bytes = 0;
  let files = 0;
  for (const name of fs.readdirSync(policy.rootDir)) {
    if (!NAME_RE.test(name)) continue;
    const target = safePath(policy, path.join(policy.rootDir, name));
    let st;
    try { st = fs.lstatSync(target); } catch (_) { continue; }
    if (!st.isFile() || st.isSymbolicLink()) continue;
    bytes += st.size;
    files += 1;
  }
  return { bytes, files };
}

function createManager(policy = createAudioUploadPolicy()) {
  ensureRoot(policy);
  let reservedBytes = 0;
  const active = new Set();

  function reserve() {
    const usage = directoryUsage(policy);
    if (usage.bytes + reservedBytes + policy.maxFileBytes > policy.maxStorageBytes) {
      const err = new Error('Audio upload storage is temporarily full. Please try again later.');
      err.status = 507;
      err.code = 'AUDIO_STORAGE_FULL';
      throw err;
    }
    reservedBytes += policy.maxFileBytes;
    return { bytes: policy.maxFileBytes };
  }

  function release(reservation) {
    if (!reservation || reservation.released) return;
    reservation.released = true;
    reservedBytes = Math.max(0, reservedBytes - Number(reservation.bytes || 0));
  }

  function track(filePath) {
    const target = safePath(policy, filePath);
    active.add(target);
    return target;
  }

  function untrack(filePath) { active.delete(path.resolve(String(filePath || ''))); }

  function remove(filePath) {
    let target;
    try { target = safePath(policy, filePath); } catch (_) { return false; }
    if (active.has(target)) return false;
    try {
      const st = fs.lstatSync(target);
      if (!st.isFile() || st.isSymbolicLink()) return false;
      fs.unlinkSync(target);
      return true;
    } catch (e) {
      if (e && e.code === 'ENOENT') return false;
      return false;
    }
  }

  function cleanupStale(now = Date.now()) {
    ensureRoot(policy);
    let scanned = 0, removed = 0, skippedActive = 0;
    for (const name of fs.readdirSync(policy.rootDir)) {
      if (scanned >= MAX_SWEEP_ENTRIES) break;
      if (!NAME_RE.test(name)) continue;
      scanned += 1;
      const target = safePath(policy, path.join(policy.rootDir, name));
      if (active.has(target)) { skippedActive += 1; continue; }
      let st;
      try { st = fs.lstatSync(target); } catch (_) { continue; }
      if (!st.isFile() || st.isSymbolicLink()) continue;
      if (now - st.mtimeMs < policy.maxAgeMs) continue;
      try { fs.unlinkSync(target); removed += 1; } catch (_) {}
    }
    return { scanned, removed, skippedActive };
  }

  function stats() {
    const usage = directoryUsage(policy);
    return { ...usage, reservedBytes, activeFiles: active.size, maxStorageBytes: policy.maxStorageBytes, maxFileBytes: policy.maxFileBytes };
  }

  return { policy, reserve, release, track, untrack, remove, cleanupStale, stats };
}

function createStorage(manager) {
  return {
    _handleFile(req, file, cb) {
      let reservation;
      let target;
      let out;
      let bytes = 0;
      let finished = false;
      const done = (err, info) => { if (!finished) { finished = true; cb(err, info); } };
      try {
        reservation = manager.reserve();
        target = manager.track(path.join(manager.policy.rootDir, managedFilename(file.originalname)));
        out = fs.createWriteStream(target, { flags: 'wx', mode: 0o600 });
      } catch (e) {
        if (reservation) manager.release(reservation);
        return done(e);
      }
      let aborted = false;
      const cleanupTarget = () => {
        try { fs.unlinkSync(target); } catch (_) {}
      };
      const fail = (err) => {
        if (aborted) return;
        aborted = true;
        try { file.stream.unpipe(out); } catch (_) {}
        try { file.stream.destroy(); } catch (_) {}
        cleanupTarget();
        manager.untrack(target);
        manager.release(reservation);
        try { out.destroy(); } catch (_) {}
        // createWriteStream opens asynchronously; if the failure raced the open,
        // retry cleanup after the fd is available and again after close.
        try { out.once('open', cleanupTarget); } catch (_) {}
        try { out.once('close', cleanupTarget); } catch (_) {}
        done(err);
      };
      file.stream.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > manager.policy.maxFileBytes) {
          const err = new Error('Audio file is too large.');
          err.code = 'LIMIT_FILE_SIZE'; err.status = 413;
          fail(err);
        }
      });
      file.stream.on('error', fail);
      out.on('error', fail);
      out.on('finish', () => {
        if (aborted) return;
        manager.untrack(target);
        manager.release(reservation);
        done(null, { destination: manager.policy.rootDir, filename: path.basename(target), path: target, size: bytes });
      });
      file.stream.pipe(out);
    },
    _removeFile(_req, file, cb) {
      try { manager.remove(file.path); } finally { cb(null); }
    },
  };
}

function cleanupRequestFiles(manager, req) {
  const files = [];
  if (req && req.file && req.file.path) files.push(req.file.path);
  if (req && req.files) {
    const values = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    for (const file of values) if (file && file.path) files.push(file.path);
  }
  for (const filePath of files) manager.remove(filePath);
  return files.length;
}

function startCleanupScheduler(manager) {
  const timer = setInterval(() => {
    try { manager.cleanupStale(); } catch (e) { console.warn('[NEXA] Audio temp cleanup skipped:', e.message); }
  }, manager.policy.sweepMs);
  timer.unref();
  return timer;
}

module.exports = {
  createAudioUploadPolicy,
  createManager,
  createStorage,
  cleanupRequestFiles,
  startCleanupScheduler,
  directoryUsage,
  isInsideRoot,
  managedFilename,
};
