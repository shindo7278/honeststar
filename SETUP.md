# Honeststar — تشغيل المشروع محليًا

## 1. تثبيت الحزم
```bash
cd honeststar
npm install
```

## 2. إعداد Supabase
1. روح على https://supabase.com وافتح مشروع جديد
2. من **SQL Editor**، شغّل محتوى ملف `supabase/schema.sql` بالكامل
3. من **Authentication > Users**، أضف أول مستخدم (إيميل/باسورد) لأول عيادة تجربة
4. من **Table Editor > clinics**، أضف صف عيادة جديد (الاسم، اسم الدكتور، لينك التقييم)
5. من **Table Editor > clinic_members**، اربط الـ `auth_user_id` (من جدول users) بـ `clinic_id` بتاع العيادة اللي أضفتها

## 3. متغيرات البيئة
```bash
cp .env.example .env.local
```
وعبّي القيم:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — من Supabase Project Settings > API
- `RESEND_API_KEY` — من حسابك على resend.com (مجاني لحد 3000 إيميل/شهر)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` — من حسابك على twilio.com بعد تفعيل WhatsApp Business API

## 4. التشغيل
```bash
npm run dev
```
افتح http://localhost:3000

## 5. إعداد الدفع (Paddle Sandbox أول مرة)
1. روح على https://sandbox-vendors.paddle.com وافتح حساب Sandbox (مجاني، للتجربة بس)
2. من **Catalog > Products**، أضف 3 منتجات: الأساسية (19£)، المتوسطة (27£)، الاحترافية (35£) — كل واحد بسعر شهري متكرر (recurring monthly)
3. من كل منتج، انسخ **Price ID** بتاعه وحطّه في `.env.local`:
   - `NEXT_PUBLIC_PADDLE_PRICE_BASIC`
   - `NEXT_PUBLIC_PADDLE_PRICE_STANDARD`
   - `NEXT_PUBLIC_PADDLE_PRICE_PRO`
4. من **Developer Tools > Authentication**، انسخ الـ Client-side token وحطه في `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
5. من **Developer Tools > API Keys**، انسخ الـ API key وحطه في `PADDLE_API_KEY`
6. من **Developer Tools > Notifications**، أضف webhook destination بالرابط:
   `https://your-domain.co.uk/api/paddle-webhook`
   (لو لسه على localhost، استخدم أداة زي `ngrok` عشان Paddle يوصلك)
   وانسخ الـ **Signing Secret** وحطه في `PADDLE_WEBHOOK_SECRET`
7. في جدول `plans` بقاعدة البيانات، حدّث عمود `paddle_price_id` لكل صف بالـ Price ID المطابق من Paddle

**لما الدومين يتفعّل وتجهز للإنتاج الحقيقي:** غيّر `NEXT_PUBLIC_PADDLE_ENV` من `sandbox` إلى `production`، وافتح حساب Paddle حقيقي (production vendor account)، وكرر الخطوات 2-7 بمفاتيح production الجديدة.

## 6. تفعيل الإرسال المجدول (Edge Function)
الإرسال بقى مجدول فعليًا، مش فوري. لما السكرتيرة تدوس "تم — ابعت"، الرسالة بتتسجل كـ"مجدولة" على الوقت المحدد، و Edge Function منفصلة بتشتغل كل دقيقة وتبعت اللي وقته استحق.

1. ثبّت Supabase CLI: `npm install -g supabase`
2. اعمل تسجيل دخول: `supabase login`
3. اربط المشروع: `supabase link --project-ref your-project-ref` (الـ ref موجود في رابط مشروعك في supabase.com)
4. ضيف الـ secrets اللي الـ function محتاجاها (نفس قيم `.env.local` تقريبًا، لكن بأسماء مختلفة شوية):
   ```bash
   supabase secrets set RESEND_API_KEY=xxx RESEND_FROM_EMAIL="Honeststar <reminders@honeststar.co.uk>" \
     TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_WHATSAPP_FROM="whatsapp:+44XXXXXXXXXX" \
     PUBLIC_APP_URL="https://honeststar.co.uk"
   ```
   (`SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` بيتحطوا تلقائيًا من Supabase، مش محتاج تضيفهم)
5. ارفع الـ function:
   ```bash
   supabase functions deploy send-scheduled-reminders
   ```
6. فعّل الجدولة (تشتغل كل دقيقة):
   ```bash
   supabase functions schedule send-scheduled-reminders --cron "* * * * *"
   ```

بكده أي عميل السكرتيرة تأكد زيارته، الرسالة هتتبعت تلقائيًا في الميعاد المحدد بدون أي تدخل يدوي.

## 7. الرفع على GitHub وربطه بـ Vercel
1. اعمل حساب على github.com لو معندكش
2. من جوه فولدر المشروع في VS Code Terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. روح على github.com، اعمل **New repository** (اسمه مثلاً `honeststar`)، خليه **Private**
4. هيدّيك أوامر زي دي، شغّلها:
   ```bash
   git remote add origin https://github.com/your-username/honeststar.git
   git branch -M main
   git push -u origin main
   ```
5. روح على vercel.com وسجل دخول بحساب GitHub بتاعك
6. دوس **Add New > Project**، واختار الـ repo بتاع honeststar
7. Vercel هيكتشف إنه مشروع Next.js تلقائيًا، متلمسش إعدادات الـ Build
8. **قبل ما تدوس Deploy**، روح لقسم **Environment Variables** وضيف كل المتغيرات اللي في `.env.local` بتاعك (نفس الأسماء بالظبط)
9. دوس **Deploy** واستنى دقيقتين
10. بعد ما يخلص، من **Project Settings > Domains**، ضيف `honeststar.co.uk` واتبع التعليمات لإضافة سجلات DNS عند مزوّد الدومين بتاعك

ملحوظة: أي تعديل بعد كده، تعمله بـ `git add . && git commit -m "..." && git push`، وVercel هيعمل نشر تلقائي (auto-deploy) في كل مرة.

## ملاحظات مهمة قبل الإطلاق الحقيقي
- **تأكيد الإيميل عند التسجيل**: افتراضيًا Supabase بيطلب من المستخدم يأكد إيميله (بضغطة على لينك) قبل ما يقدر يسجل دخول. عشان تجربة `/signup` تشتغل بسلاسة من غير ما العيادة تستنى إيميل تأكيد، روح على **Authentication > Settings > Email Auth** في Supabase وقفّل خيار **"Confirm email"** (مؤقتًا في مرحلة التجربة). قبل الإطلاق الحقيقي للعموم، الأفضل تسيبه مفعّل وتظبط قالب الإيميل (Email Template) بحيث يكون بهوية Honeststar.
- **Paddle webhook على localhost**: Paddle مش هيقدر يوصل لجهازك مباشرة وانت بتطور محليًا، فلازم تستخدم `ngrok` (مجاني) عشان تعمل رابط مؤقت عام يوصل لـ localhost بتاعك، وتحطه كـ webhook destination في خطوة 6.
- **اختبار الدفع في Sandbox**: Paddle بيوفر بطاقات تجربة وهمية (test cards) في docs.paddle.com، استخدمها للتجربة، مفيش فلوس حقيقية بتتحرك في Sandbox.

- **واتساب**: محتاج توثيق WhatsApp Business Account من Meta عبر Twilio، وموافقة على "message template" — بياخد كذا يوم أول مرة. لحد ما يتم التوثيق، استخدم `default_channel = 'email_only'` لكل العيادات.
- **الـ tracking redirect** (`/r/[token]`) لازم يكون الموقع منشور على دومين حقيقي (مش localhost) عشان اللينكات في الرسايل تشتغل صح مع العملاء.
- **سقف الباقات** (250/450/700 رسالة) بيتصفّر شهريًا — محتاج تضيف cron job (Supabase Edge Function أو Vercel Cron) يصفّر `messages_used_this_cycle` أول كل شهر.
