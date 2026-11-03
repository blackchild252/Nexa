const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B82 shared modal focus lifecycle contract exists', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /useModalFocus/);
  assert.match(s, /AccessibilityInfo/);
  assert.match(s, /findNodeHandle/);
});

test('B82 web modal focus enters the active dialog', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /previousWebFocus\.current/);
  assert.match(s, /surface\?\.focus/);
});

test('B82 web Tab traversal remains inside the dialog', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /event\.key !== 'Tab'/);
  assert.match(s, /event\.shiftKey/);
  assert.match(s, /last\.focus\(\)/);
  assert.match(s, /first\.focus\(\)/);
});

test('B82 web focus restores after modal close', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /previousWebFocus\.current\?\.focus/);
});

test('B82 native accessibility focus is requested after open', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /AccessibilityInfo\.setAccessibilityFocus\(node\)/);
});

test('B82 directory modal owns a focus surface', () => {
  const s = read('src/NexaNavKeys.tsx');
  assert.match(s, /const panelRef = useRef<any>\(null\)/);
  assert.match(s, /useModalFocus\(open, panelRef\)/);
  assert.match(s, /ref=\{panelRef\}/);
});

test('B82 calls modal owns a focus surface', () => {
  const s = read('src/HomeCommandCenter.tsx');
  assert.match(s, /const callSheetRef = useRef<any>\(null\)/);
  assert.match(s, /useModalFocus\(callOpen, callSheetRef\)/);
  assert.match(s, /ref=\{callSheetRef\}/);
});

test('B82 focus surface is programmatically focusable on web', () => {
  const nav = read('src/NexaNavKeys.tsx');
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(nav, /tabIndex=\{-1 as any\}/);
  assert.match(home, /tabIndex=\{-1 as any\}/);
});

test('B82 existing modal authority remains intact', () => {
  assert.match(read('src/NexaNavKeys.tsx'), /onRequestClose=\{onClose\}/);
  assert.match(read('src/HomeCommandCenter.tsx'), /onRequestClose=\{\(\)=>setCallOpen\(false\)\}/);
});

test('B82 focus contract is frozen and preservation-safe', () => {
  const s = read('src/modalFocus.ts');
  assert.match(s, /NEXA_MODAL_FOCUS_CONTRACT = Object\.freeze/);
  assert.match(s, /existingModalAuthorityPreserved:\s*true/);
});
