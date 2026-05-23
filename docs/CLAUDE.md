# Solutions IJ Saloum — Claude Context
_Last updated: 2026-05-22_

## What this project is
Company portfolio website for Solutions IJ Saloum. React + Vite + TypeScript, deployed on AWS Amplify.
- **Live URL:** https://solutionsijsaloum.com
- **GitHub:** https://github.com/Isaloum/SolutionsIJSaloum (branch: `main`)
- **Local repo:** `~/Desktop/Projects/SolutionsIJSaloum`
- **AWS Region:** us-east-1
- **Contact email:** support@solutionij.com

---

## Products Showcased

| Product | URL | Stack | Status |
|---------|-----|-------|--------|
| CertiPrepAI | certiprepai.com | React, Lambda, DynamoDB, Cognito, Stripe | Live |
| TaxFlowAI | tax-flow-ai.com | Next.js, NestJS, PostgreSQL, GPT-4o | Beta |
| TaxSyncForDrivers | — | React, TypeScript, AWS Lambda | Live |

---

## Tech Stack
- **Frontend:** Vite 8 + React + TypeScript (inline styles, no CSS framework)
- **Deployment:** AWS Amplify auto-deploy on push to `main`
- **Domain:** solutionsijsaloum.com (registered May 22, 2026, expires May 22, 2027)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Full single-page site — Navbar, Hero, Products, Services, Stack, Contact, Footer |
| `src/index.css` | Minimal reset only — all styles are inline in App.tsx |
| `public/logo.png` | Company logo (add this file — not yet in repo) |
| `docs/CLAUDE.md` | This file |
| `docs/lessons-learned.md` | Copied from AppBible — read before any infrastructure decision |

---

## Deployment
- **Auto-deploy:** push to `main` → Amplify builds automatically
- **Local build test:** `cd ~/Desktop/Projects/SolutionsIJSaloum && npm run build`
- **Logo:** place logo at `public/logo.png` before deploying

---

## Domains Owned (Solutions IJ Saloum)

| Domain | Expires | Used for |
|--------|---------|----------|
| solutionsijsaloum.com | May 22, 2027 | This company site |
| isaloumapps.com | Jan 14, 2027 | Available |
| certiprepai.com | Mar 31, 2027 | CertiPrepAI product |
| tax-flow-ai.com | Mar 31, 2027 | TaxFlowAI product |

---

## Sections in the site

1. **Navbar** — Logo + nav links + "Get in Touch" CTA
2. **Hero** — Headline, subtext, two CTAs
3. **Stats bar** — 3+ products, 3,910+ questions, 12 certs, 100% serverless
4. **Products** — Cards for CertiPrepAI, TaxFlowAI, TaxSyncForDrivers
5. **Services** — Cloud Architecture, Full Stack Dev, AI Integration, SaaS & Billing
6. **Tech Stack** — 20 technology badges
7. **Contact** — Form + support@solutionij.com email
8. **Footer** — Links, email, location

---

## Common Commands
```bash
# Local dev
cd ~/Desktop/Projects/SolutionsIJSaloum && npm run dev

# Build test
npm run build

# Push to deploy
git push origin main
```
