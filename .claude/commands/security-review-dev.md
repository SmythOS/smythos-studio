Run a security-focused review of changes on the current branch against origin/main.

## Setup

1. Run: `git diff $(git merge-base HEAD origin/main) HEAD`
2. Run: `pnpm audit` to check for known vulnerabilities in dependencies.

## Security Checks

Analyze ONLY for security issues across these categories:

### Injection Attacks
- **SQL injection** — raw queries with unsanitized input, missing parameterized queries
- **Command injection** — user input in `exec`, `spawn`, `execSync`, or shell commands
- **XSS** — unescaped user content rendered in HTML/JSX (bypass of DOMPurify)
- **Template injection** — user input in EJS templates or string interpolation
- **LDAP injection** — unsanitized input in directory queries

### Hardcoded Secrets
- API keys, tokens, passwords, connection strings in source code
- `.env` files or secret values committed to the repository
- Secrets logged to console or written to error responses

### Authentication & Authorization
- Missing or broken permission checks on routes/endpoints
- JWT/session validation gaps
- Privilege escalation paths (e.g., user accessing admin routes)
- Missing CSRF protection on state-changing endpoints

### Sensitive Data Exposure
- PII or tokens in logs, error messages, or client responses
- Stack traces or internal paths exposed to clients
- Sensitive data in URL query parameters

### Dependency Security
- Newly added packages — flag for review and justify necessity
- `pnpm audit` findings — report any critical/high vulnerabilities
- Packages with known CVEs or low maintenance activity

### Server Configuration
- **CORS misconfiguration** — overly permissive origins (`*`), missing credential restrictions
- **CSP misconfiguration** — missing or overly permissive Content-Security-Policy headers
- **Missing security headers** — Helmet is available; check it is applied correctly
- **Rate limiting** — new public endpoints without `express-rate-limit`

### Unsafe Code Patterns
- **Unsafe deserialization** — untrusted input passed to `JSON.parse` without try/catch, `eval`, or dynamic `require`/`import`
- **Prototype pollution** — `Object.assign`, spread, or deep-merge with user-controlled keys
- **Path traversal** — user-controlled input in `fs.readFile`, `path.join`, or file upload paths without sanitization
- **SSRF** — user-controlled URLs passed to `fetch`, `axios`, or `http.request` without allowlist validation
- **Regex DoS (ReDoS)** — complex regex patterns on user-supplied input

## Reporting

Report ALL findings regardless of confidence level.

Format each finding as:
- **Severity**: Critical / High / Medium / Low
- **File**: path and line number
- **Issue**: what's wrong
- **Impact**: what an attacker could achieve
- **Fix**: how to remediate (with code example if applicable)

## Summary

End with:
1. Count of findings by severity
2. `pnpm audit` results summary
3. Overall security verdict: **Pass** / **Needs Remediation** / **Fail**
4. If Fail, list the blocking issues
