const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('B365: shared touch-target baseline is never below WCAG-oriented 44px', () => {
  const theme = fs.readFileSync(path.join(__dirname, '..', 'src', 'theme.ts'), 'utf8');
  assert.match(theme, /minTouchTarget:\s*44/);
  assert.match(theme, /preferredTouchTarget:\s*48/);
  assert.match(theme, /compactControlHeight:\s*44/);
});

test('B365: known compact interactive controls use the shared 44px floor', () => {
  const zeeza = fs.readFileSync(path.join(__dirname, '..', 'src', 'ZeezaProfile.tsx'), 'utf8');
  const social = fs.readFileSync(path.join(__dirname, '..', 'src', 'socialStyles.ts'), 'utf8');
  assert.match(zeeza, /back:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
  assert.match(zeeza, /photoButton:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
  assert.match(social, /sendBtn:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s);
});

test('B365: readability baseline remains 100% while accessibility scaling stays available', () => {
  const screen = fs.readFileSync(path.join(__dirname, '..', 'src', 'nexaTextScale.ts'), 'utf8');
  assert.match(screen, /100%/);
  assert.match(screen, /1\.15/);
  assert.match(screen, /1\.3/);
  assert.match(screen, /1\.45/);
});
