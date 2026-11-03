import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('B58 M137 Royal Dark hero keeps existing 3D interaction and motion authorities', () => {
  const robot = read('src/NexaDamiRobot.tsx');
  assert.match(robot, /PanResponder\.create/);
  assert.match(robot, /allows\('dami'\)/);
  assert.match(robot, /allows\('vip-spotlight'\)/);
  assert.match(robot, /mode === 'light' \? LIGHT_PAL : DARK_PAL/);
  assert.match(robot, /perspective/);
  assert.match(robot, /rotateY/);
  assert.match(robot, /rotateX/);
});

test('B58 M137 Royal Dark hero adds layered shell, recessed glass and ring material', () => {
  const robot = read('src/NexaDamiRobot.tsx');
  assert.match(robot, /gold shell: bright crown-side edge/);
  assert.match(robot, /gold shell/);
  assert.match(robot, /glass face: recessed bezel/);
  assert.match(robot, /recessed bezel/);
  assert.match(robot, /locations=\{\[0, 0\.38, 1\]\}/);
  assert.match(robot, /ringInset/);
  assert.match(robot, /LinearGradient colors=\{\[P\.hi, P\.ring1, P\.ring2\]\}/);
  assert.match(robot, /shadowOffset: \{ width: 0, height: 8 \}/);
});

test('B58 M137 visual material layer remains decorative and does not create a new interaction authority', () => {
  const robot = read('src/NexaDamiRobot.tsx');
  assert.equal((robot.match(/onPress\?: \(\) => void/g) || []).length, 1);
  assert.doesNotMatch(robot, /TouchableOpacity|Pressable/);
});
