# Make Shams DeutschKarten Personal — Setup Guide

This guide walks you through replacing every shared / Replit-managed service with **your own accounts and API keys**, so the app is fully yours: your auth tenant, your AI provider, your database, your domain.

You don't need to do all of this. Do the steps for the services you want to own. Each section is independent.

---

## Quick map: what's currently shared vs. yours

| Service                  | Currently                                          | To make it personal                                          |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| Auth (sign-in / sign-up) | Replit-managed Clerk tenant                        | Your own Clerk tenant                                        |
| Database (Postgres)      | Replit-managed Postgres                            | Your own Neon / Supabase / RDS                               |
| AI card generation       | Replit AI Integrations proxy (OpenAI / Gemini)     | Your own OpenAI / Google AI key                              |
| Image generation         | Replit AI Integrations (gpt-image / Gemini Imagen) | Your own OpenAI / Google AI key                              |
| Error tracking           | None / optional Sentry                             | Your own Sentry project                                      |
| Hosting                  | Replit Autoscale Deployment                        | Replit Deployment under your account, optional custom domain |
| Push reminders (mobile)  | Expo push tokens via Expo's free service           | Same — already yours                                         |

---

## 1) Your own Clerk tenant (auth)

**Why:** controls who can sign in, branding on the login page ("Continue with Shams DeutschKarten"), email templates, OAuth providers (Google, Apple).

1. Go to https://dashboard.clerk.com → **Create application**.
2. Name it (e.g. "DeutschKarten"), enable the providers you want (Email + Google + Apple recommended).
3. Copy the two keys from **API Keys**:
   - `Publishable key` (starts with `pk_test_…` or `pk_live_…`)
   - `Secret key` (starts with `sk_test_…` or `sk_live_…`)
4. In Replit, open **Secrets** and set:
   - `CLERK_SECRET_KEY` = your secret key
   - `CLERK_PUBLISHABLE_KEY` = your publishable key
   - `VITE_CLERK_PUBLISHABLE_KEY` = same publishable key (used by the web frontend)
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = same publishable key (used by mobile)
5. **Optional — branding:** in Clerk dashboard → **Customization** → upload your logo, set app name to "Shams DeutschKarten", primary color to your accent.
6. **Optional — make yourself admin:** copy your Clerk user ID (in Users tab, looks like `user_2xx…`) and set:
   - `ADMIN_USER_IDS` = `user_2xx...` (comma-separated for multiple admins)
7. Restart the API Server workflow. Sign in with a fresh account to verify it routes through your tenant.

---

## 2) Your own database

**Why:** you own the user accounts, progress, flashcards, and quiz history. Easy to back up, export, or move.

Recommended: **Neon** (free tier, serverless Postgres, perfect fit).

1. Sign up at https://neon.tech → create a project in a region close to your users (e.g. `eu-central` for Europe).
2. Copy the connection string (looks like `postgres://user:pass@xxx.neon.tech/neondb?sslmode=require`).
3. In Replit Secrets, replace:
   - `DATABASE_URL` = your new Neon connection string
4. Push the schema to your new DB:
   ```bash
   pnpm --filter @workspace/db run push
   ```
5. Restart the API Server. Sign in once to seed your user row.
6. **Optional — migrate existing data:** export the old DB with `pg_dump` and restore into Neon. Ask me to help if you want this.

---

## 3) Your own AI provider (card + image generation)

The "AI generate cards" feature currently uses Replit's AI Integrations proxy (no key needed but billed against your Replit account). To use your own keys directly:

### Option A — OpenAI (recommended, covers both text and images)

1. Go to https://platform.openai.com → **API keys** → create one.
2. In Replit Secrets:
   - `OPENAI_API_KEY` = `sk-...`
3. The server auto-detects this and uses your key instead of the proxy.

### Option B — Google Gemini (cheaper for text, separate image flow)

1. https://aistudio.google.com → **Get API key**.
2. In Replit Secrets:
   - `GEMINI_API_KEY` = your key
3. Server auto-detects and prefers Gemini if set.

You can set both — the server picks whichever is configured. Set neither, and the app falls back to the shared Replit proxy.

---

## 4) Your own error tracking (optional)

**Why:** see real production errors with stack traces in one dashboard.

1. https://sentry.io → create a project → "Node.js" for backend, "React" for web.
2. Copy the two DSN URLs.
3. In Replit Secrets:
   - `SENTRY_DSN_BACKEND` = the Node DSN
   - `SENTRY_DSN_WEB` = the React DSN
4. Restart. Errors now flow to your Sentry.

---

## 5) Republish + share with friends

Once your secrets are in place:

1. Click **Publish** in the Replit workspace (or wait for the deploy prompt I trigger below).
2. Replit gives you a `https://your-app.replit.app` URL.
3. **Custom domain (optional):** in the Deployment tab → **Domains** → add e.g. `deutschkarten.com`. Replit handles HTTPS automatically.
4. Share the URL with friends. They can sign up with email or Google.

---

## 6) Mobile app — share with friends

You have **two paths**:

### Quick (no app store) — Expo Go

1. Friend installs **Expo Go** from App Store / Play Store.
2. You run the mobile workflow → a QR code appears in the logs.
3. Friend scans it. App opens instantly. Updates push live as you change code.
4. Limitation: requires Expo Go installed; won't work for distribution at scale.

### Production — TestFlight / Play Store internal testing

1. Install EAS CLI: `npm install -g eas-cli` (locally on your Mac/PC, not in Replit).
2. Run `eas login`, then `eas build --profile preview --platform ios` (and `android`).
3. Upload the `.ipa` to TestFlight via Transporter; upload the `.aab` to Play Console internal testing track.
4. Invite friends by email — they get TestFlight / Play test invites.
5. Apple Developer account: $99/year. Google Play: $25 one-time.

If you want, I can write a `eas.json` config and walk you through your first build.

---

## 7) Kivy desktop app — share with friends

Three options:

1. **Source distribution:** zip `artifacts/kivy-app/`, friends run `pip install -r requirements.txt && python main.py`. Requires Python.
2. **Standalone binary:** use **PyInstaller** to bundle into a single `.exe` (Windows), `.app` (macOS), or AppImage (Linux). I can add a build script if you want.
3. **App Store:** Kivy apps can be packaged for Mac App Store; harder to do, not recommended unless requested.

---

## Quick checklist before sharing

- [ ] `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` set to **your** tenant (not the Replit-managed one)
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` match
- [ ] `DATABASE_URL` points to **your** Neon / Postgres
- [ ] `OPENAI_API_KEY` and/or `GEMINI_API_KEY` set (or leave blank to use Replit shared)
- [ ] `ADMIN_USER_IDS` includes your Clerk user ID
- [ ] `SESSION_SECRET` set to a long random string (already done)
- [ ] App republished after secrets change

---

## Costs at a glance (small scale, < 100 users)

- Clerk free tier: 10,000 monthly active users — free
- Neon free tier: 0.5 GB storage, 191 compute hours — free, plenty for a flashcard app
- OpenAI: ~$0.0001 per card generated (text); images ~$0.04 each — set a $5 hard limit in OpenAI billing
- Sentry free tier: 5k errors/month — free
- Replit Deployment: depends on your plan
- Apple Developer: $99/year (only if you want iOS App Store distribution)
- Google Play: $25 one-time
- Custom domain: ~$10-15/year

**Realistic baseline for a personal project with friends: $0–10/month.**

---

## When you change secrets

Always restart the API Server workflow after changing any secret. The web and mobile read public Clerk keys at build time, so they need a fresh deploy / Metro restart too.

---

Got stuck on any step? Just say "help with step N" and I'll walk you through it.
