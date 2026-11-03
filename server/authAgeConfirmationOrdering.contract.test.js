import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const login = fs.readFileSync('src/app/auth/login.tsx', 'utf8');
const signup = fs.readFileSync('src/app/auth/signup.tsx', 'utf8');

function assertValidationPrecedesAgePersistence(source, name) {
  const validation = source.indexOf('const validation=validateAuthCredentials');
  const persist = source.indexOf('await setAdultConfirmation(true)');
  assert.ok(validation >= 0, `${name}: credential validation must remain explicit`);
  assert.ok(persist >= 0, `${name}: age confirmation persistence must remain explicit`);
  assert.ok(validation < persist, `${name}: invalid credentials must not persist adult confirmation before validation`);
}

test('Login validates credentials before persisting adult confirmation', () => {
  assertValidationPrecedesAgePersistence(login, 'Login');
});

test('Signup validates credentials before persisting adult confirmation', () => {
  assertValidationPrecedesAgePersistence(signup, 'Signup');
});
