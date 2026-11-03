#!/usr/bin/env node
// Read-only local tooling inventory. Never installs packages, downloads browsers, or edits machine settings.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const exists = p => { try { return fs.existsSync(p); } catch { return false; } };
const command = (name, args = ['--version']) => {
  const executable = process.platform === 'win32' && ['npm', 'gradle'].includes(name) ? `${name}.cmd` : name;
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true, shell: process.platform === 'win32' && ['npm', 'gradle'].includes(name) });
  return { available: result.status === 0, version: ((result.stdout || '') + (result.stderr || '')).trim().split(/\r?\n/).slice(0, 2).join(' ').slice(0, 180) || null };
};
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
const nodeModules = path.join(root, 'node_modules');
const packageAvailable = name => { try { require.resolve(`${name}/package.json`); return true; } catch { try { require.resolve(name); return true; } catch { return false; } } };
const expoBaseCandidates = [path.join(nodeModules, 'expo', 'tsconfig.base.json'), path.join(nodeModules, 'expo', 'tsconfig.base')];
const expoBaseResolvable = tsconfig.extends === 'expo/tsconfig.base' && expoBaseCandidates.some(exists);
const sdkPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '';
const sdkPresent = Boolean(sdkPath && exists(sdkPath));
const browserCache = process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
  ? process.env.PLAYWRIGHT_BROWSERS_PATH
  : process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'ms-playwright')
    : process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
      : path.join(os.homedir(), '.cache', 'ms-playwright');
const browserNames = exists(browserCache) ? fs.readdirSync(browserCache).filter(n => /^(chromium|firefox|webkit|chrome|headless_shell)/i.test(n)) : [];
const gradleWrapper = process.platform === 'win32' ? path.join(root, 'android', 'gradlew.bat') : path.join(root, 'android', 'gradlew');
const xcode = process.platform === 'darwin' ? command('xcodebuild', ['-version']) : { available: false, version: null };
let betterSqlite3NativeLoad = { status: 'NOT_INSTALLED', detail: 'better-sqlite3 package is not installed; native binary compatibility cannot be exercised.' };
if (packageAvailable('better-sqlite3')) {
  try { const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close(); betterSqlite3NativeLoad = { status: 'PASS', detail: 'better-sqlite3 loaded and opened an in-memory database for this Node ABI.' }; }
  catch (error) { betterSqlite3NativeLoad = { status: 'FAIL', detail: String(error && error.message || error).split('\n')[0].slice(0, 180) }; }
}
const result = {
  readOnly: true,
  node: { version: process.versions.node, meetsMinimum: (() => { const [a,b] = process.versions.node.split('.').map(Number); return a > 20 || (a === 20 && b >= 19); })() },
  npm: { declared: pkg.packageManager || null, installed: command('npm', ['--version']) },
  java: command('java', ['-version']),
  android: { sdkEnvironmentSet: Boolean(process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME), sdkPathExists: sdkPresent, adb: command('adb', ['version']), gradle: command('gradle', ['--version']), projectGradleWrapperPresent: exists(gradleWrapper), wrapperPropertiesPresent: exists(path.join(root, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties')) },
  browser: { playwrightPackage: packageAvailable('@playwright/test'), cacheConfigured: Boolean(process.env.PLAYWRIGHT_BROWSERS_PATH), browserCacheExists: exists(browserCache), browserNames },
  typecheck: { tsconfigExtends: tsconfig.extends || null, expoBaseResolvable, reactTypesInstalled: packageAvailable('@types/react'), reactNativeInstalled: packageAvailable('react-native'), nodeTypesInstalled: packageAvailable('@types/node'), typescriptInstalled: packageAvailable('typescript') },
  nativeModule: { betterSqlite3Installed: packageAvailable('better-sqlite3'), nativeLoad: betterSqlite3NativeLoad, nodeAbi: process.versions.modules, python: command(process.platform === 'win32' ? 'python' : 'python3', ['--version']), make: command('make', ['--version']), cppCompiler: command(process.platform === 'win32' ? 'cl' : 'c++', ['--version']), prerequisiteNote: 'better-sqlite3 needs a compatible prebuilt binary or a local native build toolchain (Python, make, C/C++ compiler) for the active Node ABI.' },
  ios: { supportedHost: process.platform === 'darwin', xcode, status: process.platform !== 'darwin' ? 'NOT AVAILABLE ON THIS HOST: iOS native builds require macOS with Xcode; no build was attempted.' : (xcode.available ? 'macOS and Xcode detected; signing and native build still require separate checks.' : 'macOS host detected but xcodebuild is unavailable; no build was attempted.') },
  webExport: { expoInstalled: packageAvailable('expo'), reactInstalled: packageAvailable('react'), reactNativeWebInstalled: packageAvailable('react-native-web') },
};
console.log(JSON.stringify(result, null, 2));
