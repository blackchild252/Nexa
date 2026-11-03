# NEXA environment notes (current version: see VERSION.md)

Keep this file with the project. It holds no passwords, tokens or keys.

## What is where
- Project: the NEXA-V<version>.zip you were given (source, Dockerfile, eas.json, .github workflows). Also on GitHub in the repo you pushed to (branch main).
- Test server: runs in the GitHub Codespace "vigilant-fishstick" as a Docker container named `nexa`.
- App builds: Expo (EAS). Owner `primenexas-team`, slug `nexa`, Android package `com.aami.nexa`.
- Expo environment "preview" (used by the APK build) holds three public values:
  - EXPO_PUBLIC_API_URL = https://vigilant-fishstick-6v55wpp6rw4r2r5wr-4000.app.github.dev
  - EXPO_PUBLIC_PRIVACY_POLICY_URL = <that address>/privacy
  - EXPO_PUBLIC_TERMS_URL = <that address>/terms
- The address above is the Codespace's. If the Codespace is deleted or renamed, it changes and the APK must be rebuilt.

## NOT in the zip, on purpose (never put these in a zip or send them to an AI)
- EXPO_TOKEN (robot token). Make a new one on expo.dev when needed; delete old ones.
- Server keys: Grok (xAI), Paystack, Sentry, DEPLOY_HOOK_URL, anything in server/.env.
- The Android signing key. It lives in Expo. Do NOT let a build make a new one, or the APK will not update the installed app.
- node_modules (rebuilt with `npm ci`).
- Test data: it lives in the Docker volume `nexa-data` inside the Codespace.

## Start or restart the test server (Codespace terminal, in /workspaces/NEXA)
```
docker build -t nexa-server .
docker rm -f nexa; docker run -d --name nexa --restart unless-stopped -p 4000:4000 -v nexa-data:/data -e NODE_ENV=development nexa-server
docker logs --tail 20 nexa
```
- Why NODE_ENV=development: in production mode the server refuses to start until the real launch settings exist (public https address, NEXA_WALLET_MODE=live, NEXA_LAUNCH_CERTIFIED=1). That is for the real launch, not this test server.
- Then: Ports tab, port 4000, Port Visibility = Public. Check `<address>/health/live` shows {"ok":true,"status":"live"}.
- Do not run `node server/index.js` directly in the Codespace: it aborts on the better-sqlite3 native module there. Docker works.
- A Codespace stops when idle (default 30 min, max 4 h in GitHub Codespaces settings). After it wakes, run `docker start nexa` if it is not up.

## Build the APK
```
export EXPO_TOKEN='<new token, typed in the terminal only>'
npx -y eas-cli@latest env:list preview
npx -y eas-cli@latest build --platform android --profile preview
```
- If asked "Generate a new Android Keystore?", stop and say no.
- The APK installs over the old app only if the signing key is the same and the build number is higher than the installed one (see VERSION.md).

## Release rules (from the project, do not change)
- Read CLAUDE.md first. Run `npm run session:start`.
- Versions, Batch, build code and zip names are only changed by `npm run release:bump`; a release ends with `npm run release:ship`.
- Naming rules live only in the locked section of AGENTS.md.
- Say plainly what was NOT tested.

## Current state
See VERSION.md and the newest B*_REPORT.md in this folder.
