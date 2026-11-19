# msar-social — منصة جدولة محتوى مسار (خاصة)
- web/ : واجهة PWA (جدول، منشور جديد، الوارد، المنصات) — عربي RTL.
- supabase/migrations/001_init.sql : الجداول وRLS (المالك msarpro@gmail.com فقط).
- supabase/functions/publish : ينشر المستحق كل دقيقة. supabase/functions/inbox : رسائل فيسبوك/إنستغرام.
- APK: GitHub Actions يبنيه (Capacitor) ويرفعه كـ artifact باسم msar-social-apk.

## الإعداد (مرة وحدة)
1. Supabase → SQL Editor: الصق 001_init.sql وشغّله.
2. Authentication → Users → Add user: msarpro@gmail.com + كلمة مرور (أنت تكتبها). عطّل Sign ups من Authentication → Providers → Email.
3. Edge Functions: انشر publish و inbox بدون Verify JWT. Secrets: CRON_KEY (قيمة عشوائية من عندك).
4. SQL (بعد استبدال القيم من عندك، لا ترسلها في المحادثة):
   select cron.schedule('social-publish','* * * * *', $$select net.http_post(url:='https://bkyzjjvmdkdxdjhayvea.supabase.co/functions/v1/publish', headers:='{"x-cron-key":"YOUR_CRON_KEY"}'::jsonb)$$);
   select cron.schedule('social-inbox','*/2 * * * *', $$select net.http_post(url:='https://bkyzjjvmdkdxdjhayvea.supabase.co/functions/v1/inbox', headers:='{"x-cron-key":"YOUR_CRON_KEY"}'::jsonb)$$);
5. web/config.js: فيه المفتاح العام (publishable) جاهز. ارفع المشروع على مستودع GitHub جديد (غير مستودع مسار) وفعّل Pages (Source: GitHub Actions).
