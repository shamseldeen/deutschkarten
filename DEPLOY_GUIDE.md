# دليل النشر الكامل — DeutschKarten

## الترتيب الصحيح للخطوات

```
1. Neon (قاعدة البيانات)     ← ابدأ هنا دائماً
2. Clerk (تسجيل الدخول)
3. Gemini API Key
4. Railway (API servers)
5. تهيئة قاعدة البيانات
6. Android APK (Expo EAS)
7. Vercel (الويب)
```

---

## الخطوة 1 — Neon (قاعدة البيانات) — مجاني

1. اذهب إلى: https://neon.tech
2. Sign up بـ GitHub
3. Create Project → اسمه `deutschkarten`
4. اختر Region الأقرب لك
5. انسخ Connection String:
   ```
   postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require
   ```

---

## الخطوة 2 — Clerk (تسجيل الدخول) — مجاني

1. اذهب إلى: https://clerk.com
2. Create Application
3. من API Keys انسخ:
   - Publishable Key: `pk_live_...`
   - Secret Key: `sk_live_...`
4. من Domains أضف روابط Railway و Vercel (بعد إنشائها)

---

## الخطوة 3 — Gemini API Key — مجاني

1. اذهب إلى: https://aistudio.google.com/apikey
2. Create API key
3. انسخ المفتاح: `AIzaSy...`

---

## الخطوة 4 — Railway (Shams API Server)

1. اذهب إلى: https://railway.app
2. Login with GitHub
3. New Project → Deploy from GitHub repo → اختر deutschkarten
4. Settings → Build:
   - Dockerfile Path: `artifacts/api-server/Dockerfile`
5. Variables → أضف:
   ```
   DATABASE_URL          = postgresql://...neon.tech/neondb?sslmode=require
   SESSION_SECRET        = any-32-random-characters-here
   CLERK_PUBLISHABLE_KEY = pk_live_...
   CLERK_SECRET_KEY      = sk_live_...
   GEMINI_API_KEY        = AIzaSy...
   OPENAI_API_KEY        = sk-... (اختياري)
   NODE_ENV              = production
   PORT                  = 8080
   ```
6. Settings → Networking → Generate Domain
7. احتفظ بالرابط: `https://xxx.up.railway.app`

## الخطوة 4ب — Railway (Ba7r API Server)

نفس الخطوات، لكن:

- Dockerfile Path: `artifacts/api-server-ba7r/Dockerfile`
- PORT = 8083

---

## الخطوة 5 — تهيئة قاعدة البيانات

على جهازك في مجلد المشروع:

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm run reset-db
```

النتيجة المتوقعة: `✅ Seeded 114 cards`

---

## الخطوة 6 — Android APK (Shams)

### ثبّت الأدوات:

```bash
npm install -g pnpm eas-cli
eas login
```

### عدّل eas.json — استبدل القيم:

ملف: `artifacts/mobile/eas.json`

```json
"EXPO_PUBLIC_API_BASE_URL": "https://xxx.up.railway.app",
"EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_..."
```

### ابنِ APK:

```bash
cd artifacts/mobile
eas build --platform android --profile preview
```

⏱️ يستغرق 5-15 دقيقة → ستحصل على رابط تنزيل APK

### Android (Ba7r):

```bash
cd ../mobile-ba7r
# عدّل artifacts/mobile-ba7r/eas.json بنفس الطريقة (رابط Ba7r API)
eas build --platform android --profile preview
```

---

## الخطوة 7 — Vercel (الويب)

### Shams Frontend:

1. https://vercel.com → Login with GitHub
2. Add New Project → deutschkarten
3. إعدادات:
   - Root Directory: `artifacts/flashcards`
   - Build Command: `cd ../.. && pnpm --filter @workspace/flashcards run build`
   - Output Directory: `dist/public`
4. Environment Variables:
   ```
   VITE_CLERK_PUBLISHABLE_KEY = pk_live_...
   ```
5. Deploy ✅

### Ba7r Frontend:

نفس الخطوات:

- Root Directory: `artifacts/flashcards-ba7r`
- Build Command: `cd ../.. && pnpm --filter @workspace/flashcards-ba7r run build`

---

## المتغيرات المطلوبة — ملخص

| المتغير                  | من أين؟             | مطلوب في               |
| ------------------------ | ------------------- | ---------------------- |
| DATABASE_URL             | neon.tech           | Railway                |
| CLERK_PUBLISHABLE_KEY    | clerk.com           | Railway + Vercel + EAS |
| CLERK_SECRET_KEY         | clerk.com           | Railway فقط            |
| SESSION_SECRET           | اخترعه أنت (32 حرف) | Railway                |
| GEMINI_API_KEY           | aistudio.google.com | Railway                |
| OPENAI_API_KEY           | platform.openai.com | Railway (اختياري)      |
| EXPO_PUBLIC_API_BASE_URL | رابط Railway        | EAS (mobile)           |

---

## التكاليف

| الخدمة         | التكلفة              |
| -------------- | -------------------- |
| Neon DB        | مجاني                |
| Clerk          | مجاني حتى 10k مستخدم |
| Gemini API     | مجاني (حد سخي)       |
| Railway        | مجاني ($5 credit)    |
| Vercel         | مجاني                |
| Expo EAS Build | مجاني (30 بناء/شهر)  |
| **المجموع**    | **$0/شهر**           |
