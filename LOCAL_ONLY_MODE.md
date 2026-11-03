# Local-only development boundary

This project is being built and verified locally only. The server runtime blocks outbound HTTP(S) `fetch` requests and permits loopback requests only. Realtime voice, remote AI providers, live payments, live market feeds, remote identity providers, email webhooks, football feeds and YouTube API fetching are not considered configured or accepted in this build. Use truthful unavailable states; never present preview values as live prices, confirmed payments, or provider actions.

Local tests may mock provider boundaries in isolated tests; mocks are not evidence of live integration. Do not contact providers or require external credentials for local verification.
