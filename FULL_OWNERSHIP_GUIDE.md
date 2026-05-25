# دليل الملكية الكاملة — DeutschKarten
> آخر تحديث: مايو 2026 · الإصدار 1.0

---

## فهرس المحتويات

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [هيكل الملفات](#2-هيكل-الملفات)
3. [قاعدة البيانات — كل جدول وكل عمود](#3-قاعدة-البيانات)
4. [الـ API — كل Route بالتفصيل](#4-الـ-api)
5. [متغيرات البيئة (Environment Variables)](#5-متغيرات-البيئة)
6. [كيف يعمل الـ Authentication](#6-الـ-authentication)
7. [الـ Web Apps — كل صفحة](#7-الـ-web-apps)
8. [تطبيق الجوال — كل شاشة](#8-تطبيق-الجوال)
9. [كيف يُبنى المشروع ويُشغَّل](#9-البناء-والتشغيل)
10. [نشر التطبيق على سيرفرك الخاص](#10-النشر-على-سيرفرك-الخاص)
11. [الخدمات الخارجية وكيف تستبدلها](#11-الخدمات-الخارجية)
12. [أوامر يومية مفيدة](#12-أوامر-يومية-مفيدة)

---

## 1. نظرة عامة على المشروع

**DeutschKarten** تطبيق بطاقات تعليمية للغة الألمانية (A1–C1)، يعمل على:

| النسخة | الثيم | الرابط |
|---|---|---|
| **Shams** (شمس) | ذهبي / كهرماني | `/flashcards/` |
| **Ba7r** (بحر) | أزرق المحيط | `/ba7r/` |

كل نسخة لها:
- **Back-end مستقل** (Express.js API)
- **Web App مستقل** (React + Vite)
- **تطبيق جوال مستقل** (Expo / React Native)
- **Schema منفصل في قاعدة البيانات** (`public` لشمس، `ba7r` لبحر)

---

## 2. هيكل الملفات

```
deutschkarten/
│
├── artifacts/
│   ├── api-server/              ← Back-end لـ Shams
│   │   ├── src/
│   │   │   ├── index.ts         ← نقطة البداية، تشغيل السيرفر
│   │   │   ├── app.ts           ← إعداد Express، Middleware، Routes
│   │   │   ├── env.ts           ← التحقق من متغيرات البيئة (Zod)
│   │   │   ├── preload.ts       ← إعداد قاعدة البيانات قبل البداية
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts      ← Middleware للمصادقة
│   │   │   │   ├── workspace.ts ← منطق عزل مساحات العمل
│   │   │   │   └── logger.ts    ← إعداد Pino logger
│   │   │   └── routes/
│   │   │       ├── flashcards.ts ← كل routes البطاقات
│   │   │       ├── quiz.ts       ← Quiz routes
│   │   │       ├── me.ts         ← Profile + Settings routes
│   │   │       ├── workspaces.ts ← Workspace CRUD
│   │   │       ├── auth.ts       ← Sign-in / Sign-up
│   │   │       ├── reports.ts    ← إبلاغ عن بطاقة + Admin
│   │   │       ├── leaderboard.ts
│   │   │       ├── community.ts
│   │   │       └── languages.ts
│   │   ├── build.mjs            ← سكريبت البناء (esbuild)
│   │   └── package.json
│   │
│   ├── api-server-ba7r/         ← نفس بنية api-server تمامًا لكن لـ Ba7r
│   │   └── src/preload.ts       ← يُجبر قاعدة البيانات على schema=ba7r
│   │
│   ├── flashcards/              ← Web App لـ Shams
│   │   └── src/
│   │       ├── main.tsx         ← نقطة البداية React
│   │       ├── App.tsx          ← Router + ClerkProvider
│   │       └── pages/           ← الصفحات (home, browse, quiz, …)
│   │
│   ├── flashcards-ba7r/         ← نفس flashcards لكن ثيم Ba7r
│   │
│   ├── mobile/                  ← تطبيق الجوال Shams (Expo)
│   │   └── app/
│   │       ├── _layout.tsx      ← Root layout + ClerkProvider
│   │       ├── (tabs)/          ← شاشات الـ Tab Bar
│   │       └── (auth)/          ← شاشات تسجيل الدخول
│   │
│   └── mobile-ba7r/             ← نفس mobile لكن ثيم Ba7r
│
├── lib/
│   ├── db/                      ← قاعدة البيانات (Drizzle ORM)
│   │   ├── src/
│   │   │   ├── schema/          ← تعريف كل الجداول
│   │   │   │   ├── flashcards.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── user-settings.ts
│   │   │   │   ├── quiz.ts
│   │   │   │   ├── reports.ts
│   │   │   │   └── workspaces.ts
│   │   │   ├── fixtures/
│   │   │   │   └── flashcards.json  ← 114 بطاقة أساسية
│   │   │   └── index.ts         ← تصدير الـ Schema + db instance
│   │   └── drizzle.config.ts
│   │
│   ├── api-spec/
│   │   └── openapi.yaml         ← عقد الـ API (المصدر الأساسي)
│   │
│   └── content/                 ← محتوى مشترك (رتب، مستويات، دوافع)
│       └── src/
│           ├── ranks.ts         ← 10 مستويات (من Tide Pool Crab إلى Kraken)
│           ├── motivations.ts   ← عبارات تحفيزية يومية
│           └── roadmap.ts       ← خارطة التعلم A1→C1
│
├── scripts/
│   ├── src/
│   │   ├── seed.ts              ← يملأ قاعدة البيانات بالبطاقات الأساسية
│   │   └── reset-db.ts          ← يمسح ويعيد بناء قاعدة البيانات
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml               ← GitHub Actions CI (يعمل عند كل PR)
│
├── pnpm-workspace.yaml          ← إعداد مساحة العمل
├── package.json                 ← أوامر الجذر
└── README.md
```

---

## 3. قاعدة البيانات

**النوع:** PostgreSQL  
**ORM:** Drizzle  
**العزل متعدد المستأجرين:** Shams → schema `public` | Ba7r → schema `ba7r`

### جدول `users` — المستخدمون
```
id            TEXT, Primary Key  ← نفس معرّف Clerk
email         TEXT, Not Null
displayName   TEXT
imageUrl      TEXT
createdAt     TIMESTAMP
updatedAt     TIMESTAMP
```

### جدول `flashcards` — البطاقات
```
id                  SERIAL, Primary Key
word                TEXT, Not Null         ← الكلمة الألمانية
article             TEXT                   ← der / die / das / null
baseWord            TEXT                   ← الجذر بدون مقطع
level               TEXT                   ← A1 / A2 / B1 / B2 / C1
category            TEXT                   ← Food, Travel, …
englishTranslation  TEXT
arabicTranslation   TEXT
exampleSentenceDe   TEXT                   ← جملة مثال بالألمانية
exampleSentenceEn   TEXT
exampleSentenceAr   TEXT
translations        JSONB                  ← ترجمات إضافية لغات أخرى
exampleTranslations JSONB
createdBy           TEXT → users.id        ← من أنشأ البطاقة
imageUrl            TEXT                   ← صورة البطاقة
known               BOOLEAN
hiddenAt            TIMESTAMP              ← null = ظاهر، غير null = مخفي
ownerWorkspaceId    TEXT → user_workspaces.id (nullable)
                                           ← null = بطاقة عامة
createdAt           TIMESTAMP
```

### جدول `user_progress` — تقدم المستخدم
```
id             TEXT, Primary Key
userId         TEXT → users.id
flashcardId    INTEGER → flashcards.id
workspaceId    TEXT (nullable)            ← null = مساحة العمل الافتراضية
known          INTEGER (0 أو 1)
timesReviewed  INTEGER
lastReviewedAt TIMESTAMP
createdAt      TIMESTAMP

UNIQUE INDEX على (userId, workspaceId, flashcardId)
```

### جدول `user_workspaces` — مساحات العمل
```
id                 TEXT, Primary Key (nanoid)
userId             TEXT → users.id
name               TEXT                   ← اسم مساحة العمل
secondaryLanguage  TEXT                   ← EN / ES / FR / IT / TR
createdAt          TIMESTAMP

الحد الأقصى: 2 مساحة لكل مستخدم (الافتراضي لا يُحسب)
```

### جدول `user_settings` — إعدادات المستخدم
```
userId              TEXT, Primary Key → users.id
primaryLang         TEXT (default: 'en')
secondaryLang       TEXT (nullable)
currentWorkspaceId  TEXT (nullable)       ← null = المساحة الافتراضية
updatedAt           TIMESTAMP
```

### جدول `user_streaks` — السلاسل اليومية
```
userId         TEXT, Primary Key → users.id
currentStreak  INTEGER (default: 0)
longestStreak  INTEGER (default: 0)
lastActiveDate DATE
updatedAt      TIMESTAMP
```

### جدول `quiz_sessions` — جلسات الاختبار
```
id              TEXT, Primary Key
userId          TEXT → users.id
mode            TEXT          ← translation / article / typing
level           TEXT (nullable)
totalQuestions  INTEGER
correctAnswers  INTEGER
startedAt       TIMESTAMP
finishedAt      TIMESTAMP
```

### جدول `quiz_answers` — إجابات الاختبار
```
id           TEXT, Primary Key
sessionId    TEXT → quiz_sessions.id
flashcardId  INTEGER → flashcards.id
questionType TEXT
prompt       JSONB
userAnswer   TEXT
correct      BOOLEAN
answeredAt   TIMESTAMP
```

### جدول `flashcard_reports` — بلاغات البطاقات
```
id          SERIAL, Primary Key
flashcardId INTEGER → flashcards.id
userId      TEXT → users.id
reason      TEXT           ← inappropriate / wrong / duplicate / other
note        TEXT (nullable)
status      TEXT           ← open / dismissed / actioned
createdAt   TIMESTAMP
resolvedAt  TIMESTAMP

UNIQUE على (flashcardId, userId) — مستخدم واحد = بلاغ واحد لكل بطاقة
البطاقة تُخفى تلقائيًا عند وصول 3 بلاغات متمايزة
```

---

## 4. الـ API

**Base URL لـ Shams:** `/api`  
**Base URL لـ Ba7r:** `/ba7r-api/api`

### 🔓 Routes عامة (بدون تسجيل دخول)

#### `GET /healthz`
- **الغرض:** فحص صحة السيرفر
- **Response:** `{ status: "ok" }`

#### `POST /auth/sign-in`
- **الغرض:** تسجيل الدخول عبر Clerk
- **Body:** `{ email: string, password: string }`
- **Response:** `{ token, sessionId, userId, email, firstName, lastName }`
- **Rate Limit:** 10 طلبات/دقيقة لكل IP

#### `POST /auth/sign-up`
- **الغرض:** إنشاء حساب جديد عبر Clerk
- **Body:** `{ email, password, firstName?, lastName? }`
- **Response:** نفس sign-in

#### `GET /flashcards`
- **الغرض:** قائمة البطاقات (تصفية بالمستوى والفئة)
- **Query Params:** `level`, `category`, `limit` (افتراضي 50), `offset`
- **Response:** `{ items: Flashcard[], total: number }`
- **ملاحظة:** البطاقات المخفية (`hiddenAt`) لا تظهر

#### `GET /flashcards/:id`
- **Response:** `Flashcard` واحدة

#### `GET /flashcards/generate/status`
- **Response:** `{ limit, used, remaining, resetsAt }`

#### `GET /leaderboard`
- **Response:** `{ top: LeaderboardRow[], me: LeaderboardRow | null }`

#### `GET /community/stats`
- **Response:** `{ totalCards, contributors, languages }`

#### `GET /languages`
- **Response:** `Array<{ code, name, rtl: boolean }>`

#### `POST /log/client-error`
- **Body:** `{ platform, url, message, stack, ... }`
- **Response:** `204 No Content`

---

### 🔒 Routes تتطلب تسجيل دخول

> الـ Token يُرسل في الـ Header: `Authorization: Bearer <clerk_jwt_token>`

#### `GET /me`
- **Response:** `{ user: User, streak: UserStreak }`

#### `GET /me/stats`
- **Response:** `Array<{ level, total, known, unknown, percentage }>`
- **ملاحظة:** تتغير حسب مساحة العمل الحالية

#### `PATCH /flashcards/:id/progress`
- **Body:** `{ known: boolean }`
- **Response:** `Flashcard` محدّثة

#### `GET /me/workspaces`
- **Response:** `{ currentId: string|null, max: 2, workspaces: Workspace[] }`

#### `POST /me/workspaces`
- **Body:** `{ secondaryLanguage: "EN"|"ES"|"FR"|"IT"|"TR", name?: string }`
- **Response:** `Workspace` (الجديدة)
- **خطأ 409:** إذا وصل المستخدم للحد الأقصى (2 مساحات)

#### `POST /me/workspaces/:id/switch`
- **Response:** `{ currentId: string }`

#### `DELETE /me/workspaces/:id`
- **Response:** `{ deleted: id }`

#### `GET /me/settings`
- **Response:** `{ primaryLang, secondaryLang, currentWorkspaceId }`

#### `PATCH /me/settings`
- **Body:** `{ primaryLang?, secondaryLang? }`
- **Response:** `UserSettings` محدّثة

#### `GET /flashcards/daily`
- **Response:** `Flashcard[]` (10 بطاقات للمراجعة اليومية)

#### `POST /flashcards/generate`
- **يتطلب:** `OPENAI_API_KEY`
- **Body:** `{ level, category?, count? (max 10) }`
- **Response:** `Flashcard[]` (البطاقات الجديدة)

#### `POST /flashcards/:id/translate`
- **Body:** `{ lang: string }` ← كود اللغة (fr, tr, es, ...)
- **Response:** `Flashcard` (مع الترجمة الجديدة مضافة)

#### `POST /quiz/start`
- **Body:** `{ mode: "translation"|"article"|"typing", level?, count?, lang? }`
- **Response:** `{ sessionId, mode, level, lang, questions: Question[] }`

#### `POST /quiz/finish`
- **Body:** `{ sessionId?, answers: Answer[] }`
- **Response:** `{ correct, total, saved: boolean }`

#### `GET /me/quiz-history`
- **Response:** `QuizSession[]` (آخر 25 جلسة)

#### `GET /me/quiz-stats`
- **Response:**
  ```json
  {
    "overall": { "sessions", "questions", "correct", "accuracy" },
    "byMode": [{ "mode", "sessions", "questions", "correct", "accuracy" }]
  }
  ```

#### `POST /flashcards/:id/report`
- **Body:** `{ reason: "inappropriate"|"wrong"|"duplicate"|"other", note?: string }`
- **Rate Limit:** 20 بلاغ/ساعة لكل مستخدم
- **Response:** `{ ok, autoHidden: boolean, alreadyReported: boolean }`

---

### 🛡️ Routes الـ Admin (مستخدمون محددون فقط)

> يتطلب أن يكون `userId` موجودًا في `ADMIN_USER_IDS`

#### `GET /admin/reports`
- **Response:** `{ reports: Report[] }` (كل البلاغات المفتوحة)

#### `POST /admin/reports/:id/dismiss`
- **Response:** `{ ok: true }`

#### `POST /admin/flashcards/:id/unhide`
- **Response:** `{ ok: true }` (يُعيد إظهار البطاقة)

#### `DELETE /admin/flashcards/:id`
- **Response:** `{ ok: true }` (يحذف البطاقة نهائيًا)

---

## 5. متغيرات البيئة

ملف `.env` في جذر المشروع (لا تُرفع لـ GitHub أبدًا):

```bash
# ضرورية — السيرفر يرفض البداية بدونها
DATABASE_URL=postgresql://user:password@host:5432/dbname
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
SESSION_SECRET=عبارة-سرية-لا-تقل-عن-16-حرف

# اختيارية
OPENAI_API_KEY=sk-...           # بدونها ميزة توليد البطاقات تُعطَّل
ADMIN_USER_IDS=user_abc,user_xyz # معرّفات Clerk للمسؤولين
NODE_ENV=production              # production / development / test
PORT=8080                        # افتراضي 8080
```

---

## 6. الـ Authentication

نستخدم **Clerk** — خدمة مصادقة جاهزة.

### كيف يعمل من البداية للنهاية

```
المستخدم يكتب بريده وكلمة المرور
         │
         ▼
Frontend (React/Expo) → Clerk SDK
         │
         ▼ يُرجع JWT Token
Frontend يحفظ الـ Token في Cookie (Web) أو Secure Storage (Mobile)
         │
         ▼
كل طلب API يُرسل: Authorization: Bearer <token>
         │
         ▼
Backend: clerkMiddleware يتحقق من الـ Token مع Clerk Servers
         │
         ▼
requireAuth middleware يستخرج userId
         │
         ▼ أول مرة؟
Backend يجلب بيانات المستخدم من Clerk ويحفظها في جدول users
         │
         ▼
Route Handler يعمل مع userId الموثوق
```

### كيف تحدد المسؤولين (Admins)
1. اذهب إلى Clerk Dashboard → Users
2. انسخ معرّف المستخدم (مثل `user_2abc123`)
3. أضفه إلى `ADMIN_USER_IDS` في ملف `.env`

---

## 7. الـ Web Apps

### صفحات Shams Web (`/flashcards/`)

| الصفحة | الرابط | ما تفعله |
|---|---|---|
| **الرئيسية** | `/flashcards/` | لوحة التحكم: تقدم المستويات، مجموعة اليوم، إحصاءات المجتمع |
| **تصفح** | `/flashcards/browse` | بحث في كل البطاقات، فلترة بالمستوى والفئة |
| **المراجعة اليومية** | `/flashcards/daily` | 10 بطاقات مخصصة للمراجعة اليوم |
| **الدراسة** | `/flashcards/study?level=A1` | جلسة دراسة لمستوى محدد |
| **الاختبار** | `/flashcards/quiz` | 3 أوضاع: ترجمة / مقالات / كتابة |
| **التوليد بالذكاء الاصطناعي** | `/flashcards/generate` | إنشاء بطاقات جديدة عبر OpenAI |
| **لوحة الصدارة** | `/flashcards/leaderboard` | ترتيب المستخدمين حسب XP |
| **الإحصاءات** | `/flashcards/stats` | أداء الاختبارات ودقة الإجابات |
| **الملف الشخصي** | `/flashcards/profile` | الرتبة، السلاسل، إعدادات اللغة، مساحات العمل |
| **تسجيل الدخول** | `/flashcards/sign-in` | Clerk sign-in |
| **إنشاء حساب** | `/flashcards/sign-up` | Clerk sign-up |

**Ba7r Web** نفس الصفحات تمامًا على `/ba7r/` بثيم مختلف.

---

## 8. تطبيق الجوال

### شاشات Shams Mobile (Expo / React Native)

| الشاشة | الملف | ما تفعله |
|---|---|---|
| **الرئيسية** | `(tabs)/index.tsx` | مرحبًا، شارة الرتبة، تقدم عام، بطاقات المستويات |
| **تصفح** | `(tabs)/browse.tsx` | قائمة البطاقات مع فلاتر المستوى |
| **المراجعة اليومية** | `(tabs)/daily.tsx` | بطاقات تُقلب بالإيماءة (swipe) |
| **الدراسة** | `study/[level].tsx` | جلسة دراسة لمستوى محدد |
| **التوليد** | `(tabs)/generate.tsx` | توليد بطاقات جديدة بالذكاء الاصطناعي |
| **الاختبار** | `(tabs)/quiz.tsx` | اختيار متعدد وكتابة حرة |
| **خارطة الطريق** | `(tabs)/roadmap.tsx` | مراحل التعلم A1→C1 وعادات الدراسة |
| **الملف الشخصي** | `(tabs)/profile.tsx` | الإحصاءات، لوحة الصدارة، الإشعارات، تسجيل الخروج |
| **تسجيل الدخول** | `(auth)/sign-in.tsx` | بريد + كلمة مرور + Google OAuth |
| **إنشاء حساب** | `(auth)/sign-up.tsx` | تسجيل + تحقق بالبريد |

**Ba7r Mobile** نفس الشاشات بثيم مختلف.

---

## 9. البناء والتشغيل

### تسلسل بداية الـ Back-end

```
pnpm run dev
    │
    ├─ predev: يبني الـ Web App (Vite) أولًا
    │          BASE_PATH=/flashcards/ vite build
    │
    ├─ build: node build.mjs
    │         esbuild يحزم الـ TypeScript → dist/index.mjs
    │
    └─ start: node --enable-source-maps dist/index.mjs
              │
              ├─ validateEnv() ← يتحقق من كل المتغيرات، يفشل فورًا إذا ناقصة
              ├─ initDB()      ← يتصل بـ PostgreSQL
              ├─ clerkMiddleware
              ├─ routes...
              └─ app.listen(PORT) ← "Server listening on port 8080"
```

### أوامر البناء الكاملة

```bash
# بناء كل شيء
pnpm run build

# typecheck فقط (بدون بناء)
pnpm run typecheck

# تشغيل الاختبارات
pnpm run test

# CI gate الكامل (format + lint + typecheck + test)
pnpm run check

# إعادة توليد الـ API client من openapi.yaml
pnpm --filter @workspace/api-spec run codegen
```

---

## 10. النشر على سيرفرك الخاص

### الطريقة أ: Railway (أسرع طريقة)

1. **أنشئ حسابًا** على [railway.app](https://railway.app)
2. **أضف قاعدة بيانات:**
   - New → Database → PostgreSQL
   - انسخ `DATABASE_URL`
3. **انشر السيرفر:**
   - New → GitHub Repo → اختر `deutschkarten`
   - Start Command: `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start`
   - Root Directory: `/` (الجذر)
4. **أضف المتغيرات:**
   ```
   DATABASE_URL=...
   CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...
   SESSION_SECRET=...
   NODE_ENV=production
   PORT=8080
   ```
5. **شغّل قاعدة البيانات:**
   ```bash
   DATABASE_URL="<railway_url>" pnpm run seed
   ```

### الطريقة ب: VPS (Ubuntu)

```bash
# 1. ثبّت Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs
npm install -g pnpm

# 2. احصل على الكود
git clone https://github.com/shamseldeen/deutschkarten.git
cd deutschkarten

# 3. ثبّت التبعيات
pnpm install --frozen-lockfile

# 4. أنشئ ملف البيئة
cp .env.example .env
nano .env   # أضف قيمك

# 5. ابنِ قاعدة البيانات
pnpm run reset-db

# 6. ابنِ المشروع
pnpm run build

# 7. شغّل مع pm2 (عملية دائمة)
npm install -g pm2
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" --name shams
pm2 start "node --enable-source-maps artifacts/api-server-ba7r/dist/index.mjs" --name ba7r
pm2 save
pm2 startup   # يضمن البداية بعد إعادة التشغيل
```

### إعداد Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Shams Web + API
    location /flashcards/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }

    # Ba7r Web + API
    location /ba7r/ {
        proxy_pass http://localhost:8083;
        proxy_set_header Host $host;
    }
    location /ba7r-api/ {
        proxy_pass http://localhost:8083;
        proxy_set_header Host $host;
    }
}
```

### إضافة HTTPS (Let's Encrypt مجاني)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### الطريقة ج: Fly.io

```bash
# ثبّت flyctl
curl -L https://fly.io/install.sh | sh

# من داخل مجلد api-server
fly launch --name deutschkarten-shams
fly secrets set DATABASE_URL="..." CLERK_SECRET_KEY="..." ...
fly deploy
```

---

## 11. الخدمات الخارجية

### Clerk (المصادقة)
- **الموقع:** [clerk.com](https://clerk.com)
- **ماذا يفعل:** تسجيل الدخول، إدارة الجلسات، OAuth (Google)
- **للتبديل إلى بديل مفتوح المصدر:** يمكن استبداله بـ [Auth.js](https://authjs.dev/) أو [Supabase Auth](https://supabase.com/auth)
- **الملفات المتأثرة:**
  - `artifacts/api-server/src/lib/auth.ts`
  - `artifacts/flashcards/src/App.tsx`
  - `artifacts/mobile/app/_layout.tsx`

### PostgreSQL (قاعدة البيانات)
- **ماذا تفعل:** تخزين كل البيانات
- **أي خدمة تناسبك:**
  | الخدمة | مجاني | ملاحظات |
  |---|---|---|
  | [Neon](https://neon.tech) | ✅ | serverless، سريع |
  | [Supabase](https://supabase.com) | ✅ | مفتوح المصدر |
  | [Railway](https://railway.app) | جزئي | سهل الإعداد |
  | VPS خاص | ✅ | تحكم كامل |

### OpenAI (توليد البطاقات)
- **اختياري** — التطبيق يعمل بدونه
- **إذا أردت بديلًا:** يمكن تعديل `routes/flashcards.ts` ليستخدم أي API متوافق مع OpenAI (مثل Groq أو Anthropic)
- **الملف:** `artifacts/api-server/src/routes/flashcards.ts` في دالة `generateFlashcards`

---

## 12. أوامر يومية مفيدة

```bash
# تشغيل Shams في وضع التطوير
pnpm --filter @workspace/api-server run dev

# تشغيل Ba7r في وضع التطوير
pnpm --filter @workspace/api-server-ba7r run dev

# فحص الكود (format + lint + typecheck + test)
pnpm run check

# إضافة بيانات تجريبية
pnpm run seed

# إعادة بناء قاعدة البيانات من الصفر (تحذير: يمسح البيانات!)
pnpm run reset-db

# تحديث الـ API client بعد تعديل openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# فحص typecheck فقط
pnpm run typecheck

# تشغيل الاختبارات فقط
pnpm run test

# تنسيق الكود تلقائيًا
pnpm run format

# بناء كل شيء للإنتاج
pnpm run build
```

---

## ملاحظات أمان مهمة

1. **لا ترفع `.env` أبدًا إلى GitHub** — هو موجود في `.gitignore`
2. **`SESSION_SECRET`** يجب أن يكون عشوائيًا وطويلًا (استخدم `openssl rand -base64 32`)
3. **`ADMIN_USER_IDS`** يُتيح حذف البطاقات وإدارة البلاغات — اختر المسؤولين بعناية
4. **في الإنتاج** تأكد أن `NODE_ENV=production` لتفعيل قيود الأمان
5. **Clerk Keys** لها نوعان: `pk_test_` / `pk_live_` — استخدم `live` فقط في الإنتاج

---

> هذه الوثيقة تغطي كل جزء في المشروع. لأي سؤال تفصيلي عن ملف أو Route معين، أخبرني وسأشرحه بالكامل.
