# B543 report — V6.1.97

**Product:** NEXA MAIN only.

**Goal (one):** a signed-in person can ask for their AAMI Central activation code from the app.

**Built**
- `src/app/zeeza/activation-code.tsx`: new screen with one button, "Send my activation code". It calls the B542 challenge route. It shows no code and has no text box. On success it says the code is in the Zeeza inbox and offers "Open my Zeeza inbox".
- `src/centralActivationCode.ts`: plain wording for success and for 401, 403, 429 and other errors. It never echoes server text.
- `src/api.ts`: `requestCentralActivationCode()`.
- `src/app/zeeza/inbox.tsx`: a link, "Get my AAMI activation code".

**TESTED/PASSED:** `server/v6_1_97_activation_code_screen.test.js` 4/4 (added to the contract list).

**NOT TESTED:** the screen on a real device or browser, full TypeScript build (no `node_modules` here), real HTTP to the route, live HTTPS.

**BLOCKED:** none new. Email 2FA still has no provider. The link shows for every signed-in user; a person with no pending grant gets a plain "no pending activation" message.

**Next (one goal):** run Main, Central and Admin together locally and activate end to end.
