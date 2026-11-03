const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B81 shared modal accessibility contract exists', () => {
  const s = read('src/modalAccessibility.ts');
  assert.match(s, /accessibilityViewIsModal:\s*true/);
  assert.match(s, /importantForAccessibility:\s*['"]yes['"]/);
  assert.match(s, /'aria-modal':\s*true/);
});

test('B81 modal backdrop is hidden from accessibility tree', () => {
  const s = read('src/modalAccessibility.ts');
  assert.match(s, /importantForAccessibility:\s*['"]no-hide-descendants['"]/);
  assert.match(s, /'aria-hidden':\s*true/);
});

test('B81 modal close intent is explicit', () => {
  const s = read('src/modalAccessibility.ts');
  assert.match(s, /Close this dialog and return to the previous screen/);
});

test('B81 NEXA directory modal uses shared modal semantics', () => {
  const s = read('src/NexaNavKeys.tsx');
  assert.match(s, /modalA11y\("NEXA directory"/);
  assert.match(s, /modalBackdropA11y\(\)/);
  assert.match(s, /modalCloseA11y\("Close NEXA directory"\)/);
});

test('B81 calls modal uses shared modal semantics', () => {
  const s = read('src/HomeCommandCenter.tsx');
  assert.match(s, /modalA11y\("Zeeza calls"/);
  assert.match(s, /modalBackdropA11y\(\)/);
  assert.match(s, /modalCloseA11y\("Close Zeeza calls"\)/);
});

test('B81 directory retains onRequestClose authority', () => {
  const s = read('src/NexaNavKeys.tsx');
  assert.match(s, /<Modal visible=\{open\} transparent animationType="none" onRequestClose=\{onClose\}>/);
});

test('B81 calls retains onRequestClose authority', () => {
  const s = read('src/HomeCommandCenter.tsx');
  assert.match(s, /<Modal visible=\{callOpen\} transparent animationType=\{callModalAnimation\} onRequestClose=\{\(\)=>setCallOpen\(false\)\}>/);
});

test('B81 modal contract preserves 44px interaction floor through existing helper', () => {
  const s = read('src/interactionAccessibility.ts');
  assert.match(s, /minWidth:\s*ACCESSIBILITY\.minTouchTarget/);
  assert.match(s, /minHeight:\s*ACCESSIBILITY\.minTouchTarget/);
});

test('B81 modal surfaces preserve enlarged text scaling', () => {
  const s = read('src/interactionAccessibility.ts');
  assert.match(s, /maxFontSizeMultiplier:\s*1\.45/);
});

test('B81 modal accessibility contract is frozen and preservation-safe', () => {
  const s = read('src/modalAccessibility.ts');
  assert.match(s, /NEXA_MODAL_ACCESSIBILITY_CONTRACT = Object\.freeze/);
  assert.match(s, /existingOnRequestClosePreserved:\s*true/);
  assert.match(s, /visualLayoutPreserved:\s*true/);
});
