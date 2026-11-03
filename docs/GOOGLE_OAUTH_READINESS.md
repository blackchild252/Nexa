# Google OAuth Readiness — M7121

**Result:** PKCE S256 added and contract-tested. Full OAuth readiness remains **BLOCKED**.

- Each authorization attempt generates a cryptographically random PKCE verifier and sends only its SHA-256 base64url challenge with method `S256`.
- The verifier is stored with the short-lived server-side state transaction and is included in the authorization-code exchange. Legacy transactions without a verifier fail closed.
- The transaction remains one-use; the callback validates state and checks the provider userinfo response for a subject and verified email.
- The verifier column is added compatibly to an existing SQLite transaction table; the fresh schema includes it.

**Still NOT TESTED / BLOCKED:** live Google provider acceptance, production client/redirect configuration, independent security review, exact registered redirect-URI evidence, ID-token issuer/audience validation if ID tokens are adopted, production session/device acceptance, and broader OAuth readiness gates such as refresh-token rotation where applicable. This is Google sign-in, not a general-purpose OAuth authorization server. Do not claim full OAuth readiness or enable unrelated OAuth capabilities based on the PKCE change.
