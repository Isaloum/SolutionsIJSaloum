# 07 — Lessons Learned
`Compiled from CertiPrepAI build history | May 2026`
`Every lesson here cost real time. Read before starting any new project.`

---

## How to use this file

These are not opinions. They are bugs, outages, and hours lost — then fixed.
Each lesson has a **what happened**, a **rule**, and a **how to avoid it next time**.
Skip them and pay the same tax again.

---

## 1. AWS & Infrastructure

---

### 1.1 Lambda zips MUST include node_modules

**What happened:**
Lambda deployed from a 1.5 KB zip that had only `index.js`. It crashed on startup with `Cannot find module 'stripe'`. Every request returned 500. Took an hour to diagnose because the error only appears in CloudWatch logs, not the API response.

**Rule:**
```bash
cd aws-lambdas/function-name
npm install
zip -r deploy.zip index.js node_modules/
aws lambda update-function-code --function-name FUNCTION_NAME --zip-file fileb://deploy.zip
```
Always `npm install` first. Always check zip size — if it's under 100 KB and you have npm deps, something is wrong.

**Never name it `lambda.zip`** — turns into a hyperlink in Claude chat and causes confusion.

---

### 1.2 Amplify does NOT inject VITE_* env vars reliably

**What happened:**
Set `VITE_CHECKOUT_API` in Amplify console branch environment variables. Vite silently used `undefined` instead of the value during build. Every checkout attempt hit `undefined/checkout` and failed. Spent hours debugging the Lambda before discovering Amplify wasn't injecting the var at all.

**Rule:**
Hardcode all API URLs directly in source until you confirm Amplify build injection works.
```typescript
// DO THIS — safe and predictable
const DB_API = 'https://dzhvi7oz29.execute-api.us-east-1.amazonaws.com'

// NOT THIS — until verified working
const DB_API = import.meta.env.VITE_DB_API  // may be undefined in production
```
To fix properly: verify vars appear in `process.env` during Amplify build by adding a `console.log` in `vite.config.ts` and checking build logs.

---

### 1.3 HTTP API Gateway v2 uses a different method field

**What happened:**
Lambda was checking `event.httpMethod` for the request method. HTTP API Gateway v2 puts the method in `event.requestContext.http.method` instead. Every POST request was rejected as 405 Method Not Allowed.

**Rule:**
Always handle both formats in Lambdas:
```javascript
const method = event.httpMethod || event.requestContext?.http?.method
```
REST API Gateway (v1) → `event.httpMethod`
HTTP API Gateway (v2) → `event.requestContext.http.method`

---

### 1.4 CloudFront cache survives Amplify deploys

**What happened:**
Pushed a fix to main. Amplify built successfully. Tested on certiprepai.com — still broken. Wasted 20 minutes thinking the fix didn't work. The old JS bundle was cached in CloudFront.

**Rule:**
After EVERY deploy that changes JS/CSS/HTML:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```
Always test in a **fresh incognito window**. Never trust a browser that has visited the site before.

---

### 1.5 WAF existing ≠ WAF protecting anything

**What happened:**
`awsprepai-waf` existed in WAFv2 with two rules (RateLimitRule + AWSManagedRulesCommonRuleSet). CloudFront `WebACLId` field was empty. The WAF was floating in the air protecting nothing for months.

**Rule:**
After creating a WAF, always verify it's attached:
```bash
aws cloudfront get-distribution --id YOUR_DIST_ID --query 'Distribution.DistributionConfig.WebACLId'
```
If empty string → not attached. Fix:
```bash
# Get full config, add WAF ARN to WebACLId, update distribution
aws cloudfront update-distribution --id YOUR_DIST_ID --if-match ETAG --distribution-config file://config.json
```

---

### 1.6 CloudWatch alarms email you when everything is FINE too

**What happened:**
Created a CloudWatch alarm for Lambda errors. Started receiving emails constantly even when the app was working perfectly. Each email said "entered OK state." Users would think something was wrong when everything was fine.

**Rule:**
Remove the `OK` action — only keep the `ALARM` action:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "your-alarm" \
  ... \
  --alarm-actions "arn:aws:sns:..." \
  # No --ok-actions
```
You want to be alerted when something breaks. Silence when everything is fine.

---

### 1.7 DynamoDB PITR is OFF by default

**What happened:**
All 5 DynamoDB tables had PITR (Point-in-Time Recovery) disabled. Discovered during an App Bible audit. If any table had been corrupted or accidentally wiped before this, recovery would have been impossible.

**Rule:**
Enable PITR on every table immediately after creation:
```bash
aws dynamodb update-continuous-backups \
  --table-name TABLE_NAME \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```
Costs almost nothing. 35-day recovery window. Non-negotiable for any table with user data.

---

### 1.8 SES MAIL FROM must be configured for DMARC alignment

**What happened:**
SES was sending emails from `amazonses.com` as the MAIL FROM domain instead of `certiprepai.com`. This caused DMARC alignment failure — AWS flagged it as HIGH severity. Emails were more likely to land in spam.

**Rule:**
After setting up SES for a domain, configure custom MAIL FROM:
```bash
aws sesv2 put-email-identity-mail-from-attributes \
  --email-identity yourdomain.com \
  --mail-from-domain mail.yourdomain.com \
  --behavior-on-mx-failure USE_DEFAULT_VALUE
```
Then add to Route 53:
- MX record: `mail.yourdomain.com` → `10 feedback-smtp.us-east-1.amazonses.com`
- TXT record: `mail.yourdomain.com` → `"v=spf1 include:amazonses.com ~all"`

---

## 2. Auth & Security

---

### 2.1 Cognito is case-sensitive. macOS is not.

**What happened:**
User signs up as `User@email.com` (macOS autocapitalizes first letter). Later tries to log in as `user@email.com`. Cognito says user not found. User thinks the app is broken.

**Rule:**
Every single auth operation MUST normalize email:
```typescript
const normalizedEmail = email.trim().toLowerCase()
```
Every email input in React MUST normalize on change:
```tsx
onChange={e => setEmail(e.target.value.trim().toLowerCase())}
```
This is non-negotiable. Never remove it.

---

### 2.2 Cognito has TWO tokens. They are NOT interchangeable.

**What happened:**
Lambda was using `idToken` for `GetUserCommand`. Cognito rejected it with 401. `GetUserCommand` requires the **access token**, not the ID token. Spent time debugging the wrong thing.

**Rule:**
| Token | Use for |
|---|---|
| `accessToken` | All Cognito API calls (`GetUserCommand`), Lambda auth headers |
| `idToken` | Reading user attributes in JWT payload (email, plan, sub) |

In every Lambda: `Authorization: Bearer ${user.accessToken}` — never idToken.

---

### 2.3 Secrets exposed in terminal output are compromised

**What happened:**
During a debug session, an AWS access key appeared in terminal output. During another session, an Anthropic API key appeared. Both had to be rotated immediately.

**Rule:**
- Never print full credentials to terminal
- Rotate immediately if you see a key in any output, screenshot, or chat
- Check shell history: `cat ~/.zsh_history | grep -i "key\|secret\|token"`
- Store all secrets in Lambda env vars (encrypted at rest), never in code or .env files in repo

---

### 2.4 UserNotConfirmedException kills new user signups silently

**What happened:**
A user signs up, never verifies their email, then tries to log in. Cognito throws `UserNotConfirmedException`. The app was showing a generic "Login failed" error with no way to recover. The user was stuck forever.

**Rule:**
In your login error handler, always check for `UserNotConfirmedException`:
```typescript
if (err.name === 'UserNotConfirmedException') {
  // Show inline verification UI — don't just show an error
  setUnconfirmed(true)
}
```
Then offer: enter code → verify → auto login, AND a resend button.

---

### 2.5 Stripe cancellation should NEVER be immediate

**What happened:**
Cancel flow was designed. Question arose: should the user lose access immediately or at period end?

**Rule:**
Always use `cancel_at_period_end: true` on Stripe subscriptions.
- User paid for the month — they keep access until it ends
- Reduces chargebacks and negative reviews
- The Stripe webhook handles Cognito plan downgrade automatically at period end
- Lambda does NOT touch Cognito plan — only the webhook does

---

### 2.6 GitHub push protection scans EVERY commit, not just the latest

**What happened:**
A secret appeared in commit A. Commit B was added to "remove" it. GitHub blocked the entire push — it scans the full commit history in the push, not just the HEAD. The secret was still reachable in commit A's diff regardless of commit B.

**Rule:**
Removing a secret in a new commit is not enough. You must rewrite history so the secret never existed:
```bash
# Collapse all commits with the secret into one clean commit
git reset --soft HEAD~N       # N = number of commits to collapse
# Remove the secret from the files
git add .
git commit -m "clean commit — secret never existed"
git push origin main
```
If the secret is in older history, use `git filter-repo` or BFG Repo Cleaner to scrub it from every commit. Rotate the secret immediately regardless — assume it's compromised the moment it touched any commit.

---

### 2.7 Form inputs without id/name break password managers and trigger browser warnings

**What happened:**
Login and Signup form inputs had no `id`, `name`, or `htmlFor` attributes. Chrome DevTools flagged 14 accessibility issues. Password managers couldn't autofill. Browser autocomplete was broken. Users had to type their email and password every single time.

**Rule:**
Every form input needs three things:
```tsx
<label htmlFor="login-email">Email</label>
<input
  id="login-email"
  name="email"
  type="email"
  autoComplete="email"
/>
```
| Attribute | Why it matters |
|---|---|
| `id` + `htmlFor` | Links label to input — screen readers and click targets |
| `name` | Enables form submission and browser autofill |
| `autoComplete` | Tells browser what data to fill: `email`, `current-password`, `new-password`, `one-time-code` |

For password inputs: `autoComplete="current-password"` on login, `autoComplete="new-password"` on signup. Without this, password managers treat every input as unknown and refuse to autofill.

---

## 3. Frontend & React

---

### 3.1 Editing the wrong file wastes hours

**What happened:**
Project had two files with similar names: `Comparisons.tsx` (at `/comparisons`, linked in navbar) and `ServiceComparison.tsx` (at `/service-comparison`, not linked anywhere). Edited `ServiceComparison.tsx` for 45 minutes, pushed, deployed — nothing changed on the live site. Had to redo all changes in the correct file.

**Rule:**
Before editing any component, verify it's the one actually rendered at the URL:
```bash
grep -r "/comparisons" react-app/src/App.tsx
```
Always confirm the route → component mapping before making changes.

---

### 3.2 scrollIntoView() scrolls the WINDOW, not the container

**What happened:**
AI Coach chat had a scroll bug — every new message caused the entire page to jump to the top. Was using `bottomRef.current?.scrollIntoView()`. This scrolls the viewport, which conflicts with the fixed layout.

**Rule:**
For scrolling inside a container (not the page), use:
```typescript
const containerRef = useRef<HTMLDivElement>(null)

// In effect:
if (containerRef.current) {
  containerRef.current.scrollTop = containerRef.current.scrollHeight
}
```
Add the ref to the scrollable div: `<div ref={containerRef} style={{ overflowY: 'auto' }}>`.
`scrollIntoView()` is for pages. `scrollTop = scrollHeight` is for containers.

---

### 3.3 TypeScript unused variables fail the Amplify build

**What happened:**
Added a variable during development, then stopped using it. Locally everything ran fine (Vite dev server ignores type errors). Amplify runs `tsc -b` before building — failed with `TS6133: 'variableName' is declared but its value is never read`. Build failed, deploy blocked.

**Rule:**
Always run a local build before pushing:
```bash
cd react-app && npm run build
```
Prefix unused vars with `_` to suppress the error:
```typescript
const _unusedVar = something  // TS won't complain
```

---

### 3.4 Vite 8 requires `base: '/'` for Amplify

**What happened:**
Deployed without `base: '/'` in `vite.config.ts`. All asset paths were relative, breaking on any non-root route. The app loaded on `/` but was blank on `/dashboard`, `/pricing`, etc.

**Rule:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/',  // MANDATORY for Amplify SPA deployment
  // ...
})
```

---

### 3.5 SPA routing requires CloudFront custom error responses

**What happened:**
User bookmarked `certiprepai.com/dashboard` and opened it directly. CloudFront looked for a file at `/dashboard`, found nothing, returned a 403 or 404. The React app never loaded.

**Rule:**
CloudFront must redirect 403 and 404 back to `index.html`:
- Error code: 403 → Response page: `/index.html` → Response code: 200
- Error code: 404 → Response page: `/index.html` → Response code: 200

Without this, any hard refresh or direct link to a non-root route breaks.

---

### 3.6 React type imports — local build passes, Amplify fails

**What happened:**
`MarkdownRenderer.tsx` used `React.CSSProperties` and `React.ReactNode` without importing React. Vite dev server and local builds were fine. Amplify runs `tsc -b` (strict TypeScript compiler) before the Vite build — it failed with type errors. Deploy blocked.

**Rule:**
Never use `React.CSSProperties` or `React.ReactNode` without an explicit import. Use named imports instead:
```typescript
import type { CSSProperties, ReactNode } from 'react'
```
Vite dev mode is lenient. `tsc -b` is not. Always run `npm run build` locally before pushing — it catches what the dev server doesn't.

---

### 3.7 Linking to a route that doesn't exist

**What happened:**
`ServiceGroups.tsx` had `<Link to="/practice">`. The `/practice` route was never registered in `App.tsx`. Clicking the link loaded a blank page with no error — React Router just rendered nothing.

**Rule:**
Before adding any `<Link to="...">` or `navigate('/...')`, verify the route exists:
```bash
grep "/practice" react-app/src/App.tsx
```
If nothing comes back — the route doesn't exist. Either add it to App.tsx first, or use the correct existing route.
Different from 3.1 (wrong file) — this is the right file, wrong destination.

---

### 3.8 React SPA canonical tags must be dynamic

**What happened:**
`index.html` had `<link rel="canonical" href="https://certiprepai.com">` hardcoded. Every page (`/pricing`, `/certifications`, `/glossary`) returned the same canonical pointing to `/`. Google flagged them all as duplicates of the homepage and refused to index them individually.

**Rule:**
In a React SPA, update the canonical tag on every route change:
```typescript
function CanonicalUpdater() {
  const { pathname } = useLocation()
  useEffect(() => {
    const tag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (tag) tag.href = `https://yourdomain.com${pathname}`
  }, [pathname])
  return null
}
```
Place `<CanonicalUpdater />` inside `<BrowserRouter>` alongside `<ScrollToTop />`.
A hardcoded canonical in `index.html` destroys SEO for every page except the homepage.

---

### 3.9 All page imports in App.tsx load on every page visit — use lazy()

**What happened:**
App.tsx had 29 static imports at the top — every page (Dashboard, MockExam, CheatSheets, CertDetail...) loaded as one bundle on the homepage. Desktop performance was 98 (fast CPU masks it). Mobile performance was 75 — slower CPU + 4G means parsing 311 KiB of unused JS tanks the score.

**Rule:**
Convert all page imports to lazy in App.tsx:
```typescript
// BEFORE — all 29 pages load on homepage
import Dashboard from './pages/Dashboard'
import MockExam from './pages/MockExam'

// AFTER — each loads only when visited
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MockExam  = lazy(() => import('./pages/MockExam'))
```
Wrap routes in Suspense with a fallback spinner:
```typescript
<Suspense fallback={<PageLoader />}>
  <Routes>...</Routes>
</Suspense>
```
Keep non-page imports (SEOMeta, AuthProvider, contexts) as static imports — they're needed everywhere.
Result: homepage bundle drops ~60%. Mobile performance jumps from 75 → 90+.

---

### 3.10 Light gray text (#94a3b8, #9ca3af) fails WCAG AA on white backgrounds

**What happened:**
Common Tailwind-inspired grays used throughout the app as secondary/subtitle text. Looked fine visually but failed Google Lighthouse accessibility audit (score 89 on desktop). These colors are too light against white backgrounds.

**Rule:**
Failing colors and their WCAG AA compliant replacements:
| Failing | Ratio | Replace with | Ratio |
|---|---|---|---|
| `#94a3b8` | 2.56:1 ❌ | `#64748b` | 4.76:1 ✅ |
| `#9ca3af` | 2.54:1 ❌ | `#6b7280` | 4.83:1 ✅ |
| `#d1d5db` | 1.47:1 ❌ | `#6b7280` | 4.83:1 ✅ |
| `#ca8a04` | 2.94:1 ❌ | `#b45309` | 4.55:1 ✅ |

Only replace `color:` (text) — not `background:` or `border:`. Colors on dark backgrounds are exempt.
Quick audit script:
```bash
grep -r "color: '#94a3b8'\|color: '#9ca3af'" src/
```

---

### 3.11 Declaring "ready to launch" before a full audit is always wrong

**What happened:**
Said "ready to launch" at least 3 times across sessions. Each time, running a full audit immediately after found critical bugs — bundle users treated as free, Stripe webhook missing env vars, wrong prices in emails, inline script breaking the site. The declaration came before the verification.

**Rule:**
Never say "ready" without running the audit first. The audit order is:
1. Read every key file
2. Check all Lambda env vars
3. Check Stripe products/prices match code
4. Run local build
5. Check CloudWatch logs for recent errors
6. THEN declare ready

A false "ready" is worse than silence — it stops the owner from looking for problems.

---

### 3.12 Missing tier in auth type breaks ALL users on that plan

**What happened:**
`cognito.ts` had `AuthUser.tier` typed as `'free' | 'monthly' | 'yearly' | 'lifetime'` — `bundle` was missing from both the TypeScript type and the `sessionToUser()` conditional. Every user who paid for the bundle plan was silently returned as `tier: 'free'`. They had zero access to any content they paid for. This lived in the codebase for weeks before the audit caught it.

**Rule:**
When adding a new plan/tier, update ALL of these in one commit:
1. `cognito.ts` — `AuthUser` type + `sessionToUser()` conditional
2. `AuthContext.tsx` — tier type definition
3. `Signup.tsx` — `PAID_PLANS` set
4. `Pricing.tsx` — `TIER_RANK`, plan cards
5. `Dashboard.tsx` — `tierInfo` map, stats row
6. Any Lambda that checks `custom:plan`

Missing any one of them = silent breakage for that tier's users.

---

### 3.13 Lambda env vars are wiped when you redeploy without specifying them

**What happened:**
Redeployed `awsprepai-stripe-webhook` with a new zip (to fix the missing `stripe` package). The deployment succeeded. But the Lambda's environment variables were not touched — they stayed intact. However, in an earlier session, the Lambda had been deployed without `COGNITO_USER_POOL_ID` in the env vars at all. Result: every Stripe webhook event (subscription renewals, cancellations) was silently crashing. Users who canceled kept their paid plan forever. Users whose subscriptions renewed got the right charge but no plan update.

**Rule:**
After every Lambda redeploy, verify its env vars are still correct:
```bash
aws lambda get-function-configuration --function-name FUNCTION_NAME \
  --query 'Environment.Variables'
```
For `awsprepai-stripe-webhook` specifically, all three must exist:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `COGNITO_USER_POOL_ID`

---

### 3.14 Stripe creates a new customer record for every checkout — unless you stop it

**What happened:**
The checkout Lambda was not looking up existing Stripe customers before creating a checkout session. Every time the same user went through checkout (subscribe, cancel, re-subscribe), Stripe created a brand new customer profile. After testing, the account had 3 separate customer records for the same email — each with their own subscription. The user was being charged multiple times.

**Rule:**
Before creating a Stripe checkout session, always look up the customer by email first:
```javascript
const existing = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 })
if (existing.data.length > 0) {
  sessionParams.customer = existing.data[0].id  // reuse
} else {
  sessionParams.customer_email = email  // create new
}
```
One email = one Stripe customer, forever. All subscriptions, upgrades, and cancellations stay under one profile.

---

### 3.15 CSP inline scripts need an exact SHA-256 hash — use Vite `define` instead

**What happened:**
Had `<script>window.global = window.globalThis || window;</script>` in `index.html` to polyfill the `global` variable needed by the AWS/Cognito SDK. CloudFront's CSP `script-src` blocked it. Tried adding the SHA-256 hash to the CSP policy — hash didn't match (whitespace difference). Removed the script to fix CSP — site went blank with `ReferenceError: global is not defined`. Spent multiple sessions fighting this loop.

**The fix:**
Use Vite's `define` config to replace `global` at build time — no inline script needed at all:
```typescript
// vite.config.ts
export default defineConfig({
  define: {
    global: 'globalThis',  // replaces all uses of `global` in bundle
  },
})
```
This compiles `global` → `globalThis` directly into the JS bundle. No inline script. No CSP issue. No hash to maintain. `globalThis` is natively supported in all modern browsers.

**Rule:** Never fight a CSP hash for a polyfill. Eliminate the inline script at the source instead.

---

### 3.16 Terms of Service must only promise what actually exists

**What happened:**
Terms.tsx section 5 (No Refund Policy) said "We offer a 3-day free trial on all subscription plans." No free trial existed anywhere in the codebase — no trial logic in Stripe, no trial period configured, nothing. This was a false legal promise. A user could argue they were owed a trial that was never delivered.

**Rule:**
Every claim in Terms of Service must correspond to something that actually works:
- If you say "3-day trial" → configure `trial_period_days: 3` in Stripe AND gate access accordingly
- If you say "cancel anytime from dashboard" → verify the cancel button actually exists and works
- If you say "data deleted on request" → verify you actually have a deletion process

Read your Terms.tsx before every launch. Audit each claim against the actual code.

---

### 3.17 Downgrade flow must be explicitly blocked, not just "not built"

**What happened:**
Downgrade flow (e.g., yearly → monthly) was listed as "not yet built" in the backlog. The Pricing page showed a "Switch to Monthly" button for yearly users. Clicking it hit the checkout Lambda, which would create a *new* monthly subscription on top of the existing yearly one — double charge, duplicate customer record. The button being visible without any handler was worse than no button at all.

**Rule:**
If a flow isn't built, make it impossible to trigger — not just undocumented:
```tsx
// Disable downgrade buttons until the flow is built
disabled={!!isDowngrade}
onClick={() => { if (isDowngrade) return }}
// Show actionable message instead
label="Contact support to downgrade"
```
An unbuilt flow that the user can accidentally trigger is a billing incident. An unbuilt flow that's visually disabled with clear messaging is acceptable.

---

### 3.18 Fixed CSS grid columns in a narrow parent container = unreadable cards

**What happened:**
Lambda@Edge section had 4 cards in `repeat(auto-fit, minmax(240px, 1fr))`. Changed it to `repeat(4, 1fr)` to make all boxes "the same width." The section lives inside a ~650px half-width column. 4 equal columns in 650px = ~155px each — cards became completely unreadable with badly wrapped text.

**Rule:**
Before setting a fixed column count, ask: what is the actual rendered width of the parent container? If the parent is already half-width (e.g., inside a 2-col grid), `repeat(4, 1fr)` produces ~80-155px columns. Always match columns to available width:
| Cards | Full-width parent | Half-width parent |
|---|---|---|
| 2 | `repeat(2, 1fr)` | `repeat(2, 1fr)` |
| 3 | `repeat(3, 1fr)` | `repeat(2, 1fr)` or stack |
| 4 | `repeat(4, 1fr)` | `repeat(2, 1fr)` (2×2) |
| 6+ | `repeat(3, 1fr)` | `repeat(2, 1fr)` |

`repeat(auto-fit, minmax(240px, 1fr))` is safer than forced columns — it adapts to the container. Use fixed columns only when you control the container width.

---

### 3.19 Tab badges must reflect real content counts — not guesses

**What happened:**
Added `count: '8'` to the Architect's Codex tab badge. The Codex has 6 parts. The `8` came from confusing the number of guide tabs with the number of Codex sections. User immediately noticed the mismatch — "8 means fuck nothing."

**Rule:**
Before setting any count/badge value, count the actual items on the page:
```bash
grep -n "PART [0-9]\|Part [0-9]" react-app/src/pages/SaaGuide.tsx | wc -l
```
The badge should answer a meaningful question for the user: "how many parts/sections/items are in this tab?" Never guess. An inaccurate number is worse than an empty badge.

---

### 3.20 Two-column grid with unequal content height leaves a white void

**What happened:**
Security Architecture section in SaaGuide used `repeat(auto-fit, minmax(320px, 1fr))` — left column had the "Layered Defense Stack" card (5 rows), right column had IAM Policy Skeleton + IAM Evaluation Logic + IAM Condition Operators + Cross-Account Role + Directory Services (~5 stacked cards). Right column was 3× taller than left. Left had a huge white empty space beneath its single card.

**Rule:**
A CSS grid with 2 columns where one column is much taller than the other will show empty white space in the shorter column. Fix options:
1. **Best**: Switch to `display: 'flex', flexDirection: 'column'` — everything stacks, no gaps
2. **Acceptable**: Add `align-items: 'start'` to the grid — cells don't stretch but gap is still visible
3. **Avoid**: Trying to pad or fill the shorter column with fake content

If content is genuinely unequal in height, don't use a 2-column grid. Use a single flex column instead.

---

## 4. Development Workflow

---

### 4.1 macOS `sed -i ''` does not interpret `\n`

**What happened:**
Tried to insert a newline in a file using `sed -i '' 's/old/new\n/'`. macOS sed treated `\n` as a literal backslash-n, not a newline. File was corrupted.

**Rule:**
On macOS, use Python for any string replacement that needs newlines:
```bash
python3 -c "
f = open('file.tsx').read()
f = f.replace('old', 'new')
open('file.tsx', 'w').write(f)
"
```

---

### 4.2 GitHub killed password authentication in 2021

**What happened:**
`git push` prompted for username/password. Entered GitHub password. Rejected. Confused about why auth was failing.

**Rule:**
GitHub requires a Personal Access Token (PAT), not your password:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate with `repo` scope
3. Use token as the password when git prompts

To store permanently:
```bash
git remote set-url origin https://USERNAME:TOKEN@github.com/USERNAME/REPO.git
```

---

### 4.3 git HEAD.lock blocks all git operations

**What happened:**
A previous git operation was interrupted. Git left a `HEAD.lock` file behind. Every subsequent git command failed with "Unable to create HEAD.lock: File exists."

**Rule:**
```bash
rm -f ~/Desktop/Projects/YOUR_PROJECT/.git/HEAD.lock
```

---

### 4.4 npm audit should run before every deploy

**What happened:**
`npm audit` had never been run on the project. During an App Bible audit, ran it and found 1 moderate CVE (PostCSS XSS vulnerability). Fixed in one command. Could have been critical.

**Rule:**
Add to deploy checklist:
```bash
cd react-app && npm audit
npm audit fix  # auto-fix safe patches
```
Dependabot or Renovate should be configured to send automated PRs for vulnerable dependencies.

---

### 4.5 Sentry scrubbing is NOT optional — it's a security requirement

**What happened:**
Sentry captures full request context including headers and body. Without explicit scrubbing, auth tokens (`accessToken`, `idToken`), passwords, and payment data get shipped to Sentry's servers (a third party). That's a security incident even if Sentry itself is secure — you've now shared credentials outside your infrastructure.

**Rule:**
Always add a `beforeSend` hook when initializing Sentry:
```typescript
Sentry.init({
  dsn: '...',
  beforeSend(event) {
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>
      delete data.password
      delete data.token
      delete data.accessToken
      delete data.idToken
      delete data.cardNumber
    }
    return event
  },
})
```
Also set `enabled: window.location.hostname === 'yourdomain.com'` — never send errors from local dev to production Sentry.

---

### 4.6 API Gateway has zero rate limiting by default — and WAF doesn't cover it

**What happened:**
WAF with RateLimitRule was attached to CloudFront. This protects the frontend. But all 4 API Gateways (DB, Cancel, AI Coach, Upgrade) had zero throttling configured. A targeted attack that calls API Gateway URLs directly — bypassing CloudFront entirely — hits Lambda with unlimited requests. Lambda scales to absorb it, you pay for every invocation.

**Rule:**
After creating any API Gateway, set default throttling immediately:
```bash
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/defaultRouteSettings/throttlingBurstLimit,value=100 \
    op=replace,path=/defaultRouteSettings/throttlingRateLimit,value=50
```
WAF at CloudFront ≠ protection for direct API Gateway calls. Both layers need rate limiting.

⚠️ **Partially resolved as of May 2026** — 5 of 6 API Gateways have throttling (DB: burst 50/rate 30, others: burst 20/rate 10). The Stripe webhook API (515bmmrebh) has no throttling — intentional since it's called by Stripe's servers, not users. A generous limit (burst 100, rate 50) can be added without risk.

---

### 4.7 Pasting multi-line commands injects `[200~` prefix

**What happened:**
Copied a multi-line bash command from Claude and pasted it into the terminal. The terminal printed `[200~` at the start of the command and `[201~` at the end. The command was corrupted and failed with a confusing error about an unknown flag or bad syntax.

**Rule:**
Bracketed paste mode wraps any pasted text with escape sequences (`[200~` ... `[201~`). Multi-line commands are especially vulnerable — the newlines trigger execution mid-paste.

Two options:
1. **Send commands one at a time** — paste and run each line separately
2. **Disable bracketed paste mode** — add to `~/.zshrc`:
```bash
unset zle_bracketed_paste
```
When copying from Claude, prefer single-line commands or scripts saved to a file and executed with `bash script.sh`.

---

### 4.8 String replace silently fails if whitespace doesn't match exactly

**What happened:**
Tried to replace `!['yearly','lifetime']` (no space after comma). The actual code had `!['yearly', 'lifetime']` (space after comma). Python's `str.replace()`, sed, and node all failed silently — no error, no output, file unchanged. Spent time debugging why the change wasn't taking effect.

**Rule:**
Before writing any replace command, copy the exact string from the file:
```bash
grep -n "yearly" react-app/src/pages/YourFile.tsx
```
Then build the replace around what `grep` returns — not what you think the code looks like. A single space difference causes a silent no-op.

---

### 4.9 `sed` replaces ALL matches, not just the one you want

**What happened:**
Used `sed` to remove `planRank` from one function in a file. The pattern matched in two places — `planRank` existed in a second function too. `sed` removed both silently. Build broke with `Cannot find name 'planRank'` pointing to the second function, which still needed it. Took time to diagnose because the error pointed to the wrong location.

**Rule:**
Never use `sed` when your pattern could match more than once in a file. Use Python with enough surrounding context to make the match unique:
```python
python3 -c "
f = open('file.tsx').read()
# Use enough context that this string can only match ONCE
f = f.replace(
  'const planRank = TIER_RANK[tier]\n  const isPremium',
  'const isPremium'
)
open('file.tsx', 'w').write(f)
"
```
If you must use `sed`, add line number targeting: `sed -i '' '42s/old/new/'` — replaces only on line 42.

---

### 4.10 Claude worktree edits do NOT update the root file tracked by git

**What happened:**
Claude's Edit tool was called on `/Users/ihabsaloum/Desktop/Projects/CertiPrepAI/.claude/worktrees/infallible-goldwasser-207938/CLAUDE.md` (the worktree copy of the file). Then ran `git add CLAUDE.md` from the main repo root — which staged the root-level file, which only had the date change. The full "Built This Session" section added to the worktree copy was never committed. Commit showed `1 insertion(+), 2 deletions(-)` — dead giveaway the large additions were missing.

**Rule:**
When Claude is running in a worktree, file edits go to the worktree path. The main repo's git only tracks the file at the root. They are two separate copies. Always explicitly target the root file:
```bash
# Wrong — edits go to worktree, not tracked by main repo
Edit("/path/to/.claude/worktrees/XXXX/CLAUDE.md")

# Right — edits go to the actual tracked file
Edit("/Users/ihabsaloum/Desktop/Projects/CertiPrepAI/CLAUDE.md")
```
After any CLAUDE.md commit, verify the diff is the right size:
```bash
git show --stat HEAD
# "1 insertion(+), 2 deletions(-)" after a 60-line addition = wrong file was committed
```

---

### 4.11 .DS_Store and zip files commit silently if not in .gitignore

**What happened:**
`git add aws-lambdas/` picked up macOS `.DS_Store` files and Lambda deployment `.zip` files sitting in the same folders. They got committed and pushed — bloating the repo with 225 KB of junk that serves no purpose and can't be easily removed later.

**Rule:**
Add to `.gitignore` immediately on every new project:
```
.DS_Store
**/.DS_Store
**/*.zip
```
If already committed, remove from tracking without deleting the files:
```bash
git rm -r --cached "**/.DS_Store"
git rm --cached "**/*.zip"
git commit -m "chore: untrack .DS_Store and zip files"
```
`.DS_Store` is a macOS metadata file created in every folder you open in Finder. It will commit silently every time unless blocked.

---

## 5. Architecture Decisions That Saved Money

---

### 5.1 Serverless at Tier 1 = near-zero infrastructure cost

CertiPrepAI runs entirely on serverless AWS:
- Lambda (pay per invocation, not per hour)
- DynamoDB (pay per read/write, not per instance)
- Cognito (free up to 50,000 MAUs)
- Amplify (pay per build minute + GB served)

**Result:** CertiPrepAI infrastructure cost = ~$0/month at current scale. All hosting cost ($17-18/mo) is WorkMail + Route 53.

**Rule:** Never provision an EC2 instance or RDS database at Tier 1. Serverless first, always.

---

### 5.2 Cognito custom attributes beat a users table

Initial plan was a separate DynamoDB `awsprepai-users` table. Removed it. User plan, stripe_customer_id, and expiry stored directly in Cognito custom attributes (`custom:plan`, `custom:stripe_customer_id`, `custom:plan_expiry`).

**Benefits:**
- One less table to manage and back up
- User data lives with auth — no join needed
- Stripe webhook writes directly to Cognito → zero sync issues

**Limitation:** Cognito attributes can't be queried in bulk. If you need "all users on monthly plan" → need a separate table.

---

### 5.3 Hardcoded API URLs are fine until you need to change them

Spent time trying to make Amplify inject VITE_* env vars. Didn't work reliably. Hardcoded the API Gateway URLs directly in source. This is fine — the URLs are not secrets (they have auth at the endpoint level), and they never change unless you recreate the API Gateway.

**Rule:** Don't over-engineer config management at Tier 1. Hardcode stable values. Only move to env vars if you have a real reason (multiple environments, frequent changes).

---

## 6. Security Checklist (Built From Experience)

Run this after every new project is stood up:

```
□ Security headers: A+ on securityheaders.com
  → CloudFront response headers policy with CSP, HSTS, X-Frame-Options, etc.

□ WAF attached to CloudFront
  → Verify WebACLId field is NOT empty after creation

□ SES MAIL FROM configured
  → mail.yourdomain.com with MX + SPF records in Route 53

□ DMARC record in Route 53
  → _dmarc.yourdomain.com TXT "v=DMARC1;p=quarantine;pct=100;fo=1"

□ DKIM enabled in SES
  → Status: SUCCESS (not PENDING)

□ DynamoDB PITR on every table
  → Check each table → Backups → PITR enabled

□ CloudWatch alarm on Lambda errors
  → Alert on ALARM only, no OK action

□ Sentry or equivalent error tracking
  → Production-only, sensitive data scrubbed

□ Uptime monitor
  → UptimeRobot or equivalent, alerts to phone/email

□ npm audit: zero high/critical vulnerabilities

□ No secrets in code, .env files, or git history

□ Cognito password policy: 8+ chars, mixed case, numbers, symbols

□ All endpoints validate auth server-side
  → Never trust client-sent roles or user IDs
```

---

## 5. Content & Educational Products

---

### 5.1 Always review external educational content for accuracy before publishing

**What happened:**
Added "THE SAA-C03 CODEX" (a comprehensive study guide from an external source) as an 8th tab in SaaGuide. Before building, reviewed the content and found 3 factual errors:
1. Pilot Light and Warm Standby were described as the same tier — they are distinct DR strategies (Pilot Light = DB only running; Warm Standby = full env at reduced capacity)
2. Active/Active Multi-Site RTO was listed as "Minutes" — it is "Seconds / Near-zero"
3. Port 3389 (RDP) was missing from the port reference

Similarly, for the CLF/AIF Codex content, found 3 more errors:
1. "Minimum 3 AZs per region" — some regions have only 2 AZs. Correct: "typically 3 (minimum 2)"
2. Reserved Instances discount listed as "up to 75%" — AWS docs say 72%. Creates inconsistency with the Numbers & Facts tab
3. Lambda listed as PaaS — Lambda is FaaS (Function as a Service), a subset of serverless compute, not Platform as a Service

**Rule:**
Never take external educational content at face value. Before adding any study material:
1. Cross-check numeric facts against AWS documentation (port numbers, limits, percentages)
2. Verify tier distinctions are accurate (DR tiers, service categories, pricing)
3. Check for internal consistency — if the same fact appears in two places on the site, they must agree
4. Fix errors BEFORE publishing — wrong study material is worse than no material

```
Review checklist for new content:
[ ] All numeric values match AWS docs
[ ] All service categorisations are correct (IaaS/PaaS/FaaS/SaaS)
[ ] All tier/level distinctions are distinct and accurate
[ ] No internal contradictions with existing content on the site
[ ] DR strategy tiers are correctly ordered and differentiated
```

---

### 5.2 Systematic gap analysis beats ad-hoc content additions

**What happened:**
Had a comprehensive SAA-C03 technical document and needed to know what was already covered vs. what was missing before building. Instead of building immediately, ran a structured `grep` audit across `SaaGuide.tsx` against every topic in the document. This revealed:
- 8 exam-critical gaps (IAM Condition Operators, cross-account role delegation, Directory Services, Aurora endpoints, Lambda@Edge, DynamoDB RCU/WCU math, Cognito User/Identity Pool distinction in Matrix, GWLB)
- 13 medium-priority gaps (QLDB, Timestream, Managed Blockchain, RDS Enhanced Monitoring, EC2 Hibernate, Image Builder, EBS DLM, EFS Access Points, FSx ONTAP, Egress-Only IGW, Transit VIF, SNS Filtering, Health Dashboard)

Without the audit, random additions would duplicate existing content and miss critical gaps.

**Rule:**
Before adding content to any educational page, run a coverage audit:
```bash
# Check what's already covered
grep -n "TOPIC_KEYWORD" react-app/src/pages/GuideFile.tsx

# Build a matrix: Source Topic → Already covered? → Where? → Gap?
```
Then classify gaps by exam frequency (critical vs. medium vs. low priority) before deciding what to build. This is more valuable than building first and discovering duplicates later.

---

### 5.3 Content belongs in the right section — map it before you write it

**What happened:**
SAA-C03 gap content fell into three distinct categories, each requiring a different approach:
- **Decision Matrix**: new service → use case mappings (26 rows added)
- **Numbers & Facts**: quantitative formulas + worked examples (DynamoDB RCU/WCU)
- **Architect's Codex**: conceptual frameworks with visual hierarchy (IAM Conditions, Directory Services, Lambda@Edge stages)

Trying to put all new content in one place would have created an unreadable wall of text. Mapping each piece to the correct existing section before writing kept each tab coherent.

**Rule:**
Before writing any new educational content, classify it:
| Content type | Best tab |
|---|---|
| "Which service for scenario X?" | Decision Matrix |
| "A number / limit / threshold" | Numbers & Facts |
| "How does this work / what are the tiers?" | Deep Dives |
| "A formula or calculation" | Numbers & Facts (with worked example) |
| "A decision framework / flowchart" | Architect's Codex |
| "A trap / wrong answer pattern" | Exam Traps |

---

## 7. The Mistakes You Only Make Once

| Mistake | Cost | Never again |
|---|---|---|
| Lambda zip without node_modules | 1+ hour debugging | Always check zip size before deploying |
| Trusting Amplify env var injection | Hours of broken checkout | Hardcode until verified working |
| Using idToken instead of accessToken | Auth failures across all Lambda calls | accessToken for API calls, idToken for payload reading |
| Editing the wrong file (similar names) | 45+ min wasted work + re-doing everything | `grep` the route in App.tsx before editing |
| No CloudFront invalidation after deploy | Testing old code thinking it's new | Invalidate is part of the deploy command |
| AWS/Stripe/Anthropic key in terminal output | Immediate rotation required | Rotate on sight, no exceptions |
| scrollIntoView() in a fixed layout | Page jumps to top on every message | scrollTop = scrollHeight for containers |
| Unused TypeScript variables | Amplify build fails | Run `npm run build` locally before every push |
| WAF created but not attached | Months of unprotected traffic | Verify WebACLId after every WAF operation |
| CloudWatch alarm OK action enabled | Inbox flooded with "everything is fine" emails | Remove OK action, keep ALARM action only |
| PITR not enabled on DynamoDB | Data loss risk with no recovery window | Enable immediately on table creation |
| React.CSSProperties without import | Amplify tsc -b fails, deploy blocked | Use `import type { CSSProperties } from 'react'`, always run `npm run build` locally |
| Link to non-existent route | Blank page, no error, silent failure | `grep` the route in App.tsx before adding any `<Link to="...">` |
| Sentry without beforeSend scrubbing | Auth tokens shipped to third-party server | Always scrub password/token/accessToken/idToken in beforeSend |
| API Gateway with no throttling | Direct-to-Lambda attacks bypass CloudFront WAF | Set burst + rate limits on every HTTP API v2 stage at creation — use `aws apigatewayv2 update-stage` not `aws apigateway` |
| Secret removed in new commit, push blocked | GitHub scans full history — secret still in commit A | `git reset --soft HEAD~N` → clean single commit → push |
| Multi-line paste injects `[200~` | Command corrupted, fails with confusing error | Paste one line at a time, or disable bracketed paste in .zshrc |
| String replace with wrong whitespace | Silent no-op — file unchanged, no error | `grep -n` the exact string first, build replace around what grep returns |
| `sed` matches in 2 places, removes both | Build breaks in unrelated function | Use Python with unique surrounding context, or target by line number |
| Hardcoded canonical tag in index.html | Google indexes all pages as homepage duplicates | Dynamic CanonicalUpdater component inside BrowserRouter |
| Static imports for all routes in App.tsx | 311 KiB loads on homepage, mobile perf tanks to 75 | Convert all page imports to React.lazy() + Suspense |
| Light gray text (#94a3b8, #9ca3af) on white | Fails WCAG AA, accessibility score 89 | Replace with #64748b / #6b7280 — same family, one shade darker |
| .DS_Store and .zip committed to git | Repo bloated, junk in version history | Add to .gitignore on day 1 of every project |
| Form inputs missing id/name/autoComplete | Password managers broken, 14 accessibility warnings | Every input needs id, name, htmlFor, autoComplete |
| Declaring "ready to launch" before auditing | Critical bugs found every single time after the declaration | Audit first, declare ready second. Never the other way. |
| Missing tier in auth type (bundle → free) | All bundle users had zero access to paid content | When adding a plan, update cognito.ts type + sessionToUser + Signup PAID_PLANS + Dashboard + all Lambdas in ONE commit |
| Lambda redeployed without checking env vars | Stripe webhook missing COGNITO_USER_POOL_ID — all cancellations silently failed for weeks | After every Lambda redeploy, run `get-function-configuration` and verify env vars |
| Checkout Lambda not reusing Stripe customer | Same user gets 3 customer records, charged multiple times | Look up customer by email before creating session — `stripe.customers.list({ email })` |
| CSP hash fight with inline polyfill script | Days of back-and-forth, site went blank twice | Use `define: { global: 'globalThis' }` in vite.config.ts — no inline script needed |
| Terms claiming a 3-day trial that doesn't exist | Legal liability — promising something not built | Read every Terms claim against actual code before launch |
| Downgrade button hitting checkout instead of blocking | Would create duplicate subscription + double charge | Disable downgrade buttons explicitly, show "contact support" until flow is built |
| External content published without accuracy review | Wrong facts in study material — worse than no material | Review every numeric value, tier distinction, and service categorisation before publishing |
| "Minimum 3 AZs" stated without checking | Some AWS regions have only 2 AZs — factually wrong in published material | Always cross-check AWS-specific claims against current AWS documentation |
| Lambda labelled as PaaS instead of FaaS | Incorrect service model classification in educational content | Lambda = FaaS (Function as a Service). IaaS → PaaS → FaaS → SaaS is the correct order |
| RI discount listed as 75% instead of 72% | Internal inconsistency between two tabs on the same site | When a fact appears in multiple places, they must agree — audit for contradictions before publishing |
| Adding content without gap analysis first | Duplicated existing content, missed critical gaps | `grep` the target file for every topic before writing anything — build a covered/gap matrix first |
| All new content dumped into one section | Unreadable wall of text, wrong UX for the content type | Classify content (formula → Numbers tab, framework → Codex, scenario → Matrix) before writing |
| `repeat(4, 1fr)` inside a half-width container | Cards are ~80px wide — completely unreadable | Always consider parent container width; use `repeat(2, 1fr)` for 4 cards in narrow columns |
| Tab badge count set by guessing (`'8'` for 6 parts) | Wrong number visible to all users, immediate trust damage | Count actual items with `grep` before setting any badge value |
| 2-col grid with unequal column heights | Tall white void beside shorter column | Switch to `display: flex, flexDirection: column` when content heights differ significantly |
| Claude Edit targeting worktree path instead of root file | CLAUDE.md update lost — only date change committed | Always target the root file path; verify commit diff size matches expected additions |
| index.html and SEOMeta.tsx had different question counts (3,958 vs 3,910) | Crawlers saw one number, users saw another — silent SEO inconsistency | index.html is the pre-hydration fallback crawlers read first — it must match SEOMeta.tsx exactly |
| og:image completely missing from all pages | Social shares (LinkedIn, Twitter, Slack) showed no preview image for 6+ months | Add og:image + twitter:image to both index.html (fallback) and SEOMeta.tsx (dynamic) on day 1 |
| SVG og:image doesn't render on LinkedIn/Twitter | Social platforms require raster PNG/JPG — SVG silently ignored | Convert to PNG first via `sips -s format png input.svg --out output.png` (macOS built-in, preserves exact dimensions) |
| Sitemap had 12 URLs out of 27 real pages | 15 pages invisible to Google — cert pages, guides, cheat-sheets all missing | Every time a new route is added to App.tsx, add it to sitemap.xml in the same commit |
| Empty radar chart shown to new users | Ghost chart with dashes everywhere — worst possible first impression | Always build an empty state before launching a data-driven component; ghost UI = confusion |
| Domain gap scores shown without sample size context | "+12%" from 2 questions vs 50 questions looks identical — misleading | Always show n= or question count alongside any computed metric |

---

`Last updated: May 2026 — CertiPrepAI project`
`Add new lessons here whenever something costs you more than 30 minutes.`
