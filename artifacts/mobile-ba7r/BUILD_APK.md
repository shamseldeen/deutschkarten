# Build the Ba7r DeutschKarten Android APK / AAB

This Replit container cannot build Android binaries directly (it has no Android
SDK, JDK, or Gradle — a full Android toolchain is ~10 GB). Instead you use
**EAS Build**, Expo's free cloud build service. One command produces a
downloadable, signed APK or an AAB ready for the Play Store.

---

## One-time setup (5 minutes)

1. Create a free Expo account: https://expo.dev/signup
2. Install the EAS CLI on your machine (anywhere with Node 18+):
   ```bash
   npm install -g eas-cli
   ```
3. Log in:
   ```bash
   eas login
   ```
4. From this folder (`artifacts/mobile`), link the project:
   ```bash
   eas init
   ```
   It will create a project on Expo's servers and write the `projectId` into
   `app.json` automatically.

---

## ⚠️ Set your production API URL first

The installed APK can't reach `localhost`. Before building, point it at your
deployed API server by setting the env var inside `artifacts/mobile/.env`:

```bash
echo 'EXPO_PUBLIC_API_BASE_URL=https://your-app.replit.app' > .env
```

Replace `https://your-app.replit.app` with the URL Replit gave you after
publishing the API server.

## Build an **APK** (for testing / sideloading)

```bash
eas build -p android --profile preview
```

- Runs on Expo's cloud builders (free tier available).
- Takes ~10–20 minutes.
- When done, you get a download link to a signed `.apk` you can install on
  any Android phone (enable "Install from unknown sources").

---

## Build an **AAB** (for Google Play Store upload)

Google Play **requires an `.aab` (Android App Bundle)**, not a plain APK:

```bash
eas build -p android --profile production
```

This produces a signed `.aab` ready to upload to Play Console:
1. Go to https://play.google.com/console
2. Create a new app → fill in store listing.
3. Production → Create new release → Upload the `.aab` from the EAS download
   link.

---

## App identity (already configured)

- App name: **Ba7r DeutschKarten**
- Package: `com.ba7r.deutschkarten`
- Version: `1.0.0` (bump in `app.json` before each release)
- iOS bundle id: `com.ba7r.deutschkarten`

To change the package name, edit `app.json` → `expo.android.package`.

---

## Don't have a computer handy?

You can also kick off EAS builds from any browser by pushing this repo to
GitHub and connecting it at https://expo.dev → your project → **Builds** →
**Create a build**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `eas: command not found` | `npm install -g eas-cli` |
| Build fails on `expo-router` origin | Edit `app.json` `plugins → expo-router → origin` to your production API URL |
| API requests fail in the installed APK | The APK can't reach `localhost`. Deploy the API server (Replit Deployments) and set the URL in `lib/api.ts` `setApiBaseUrl()` |
