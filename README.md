# راه‌اندازی

## ۱) نصب و لاگین
```
npm install
npx wrangler login
```

## ۲) ساخت دیتابیس D1
```
npx wrangler d1 create fight-bot-db
```
خروجی این دستور یک `database_id` میده - بذارش توی `wrangler.toml` جای `CHANGE_ME`.

## ۳) اجرای schema
```
npm run db:migrate:remote
```

## ۴) تنظیم مقادیر ثابت
توی `src/config/constants.ts` این‌ها رو حتماً عوض کن:
- `GROUP_ACTIVATION_CODE` - کد فعال‌سازی گروه‌ها
- `STAFF_IDS` - آیدی عددی کارمندها
- `BOT_USERNAME` - یوزرنیم بات (بدون @)
- `WEBAPP_BASE_URL` - بعد از اولین دیپلوی، آدرس Workers خودت رو (مثلا `https://telegram-fight-bot.<subdomain>.workers.dev`) اینجا بذار

## ۵) ست کردن secret ها
```
npx wrangler secret put BOT_TOKEN
npx wrangler secret put BOT_WEBHOOK_SECRET
```
`BOT_TOKEN` رو از @BotFather بگیر. `BOT_WEBHOOK_SECRET` هر رشته‌ی تصادفی و بلندی که خودت بخوای.

## ۶) دیپلوی
```
npm run deploy
```

## ۷) ست کردن وبهوک تلگرام
بعد از دیپلوی، این URL رو صدا بزن (یک‌بار کافیه):
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-worker-domain>/telegram-webhook/<BOT_WEBHOOK_SECRET>
```

## توسعه‌ی محلی
```
npm run db:migrate:local
npm run dev
```
(برای تست وبهوک به‌صورت local به یه ابزار مثل ngrok/cloudflared tunnel نیاز داری)

## گرافیک صحنه‌ی مبارزه (Duel/Forest/Dungeon)

سیستم گرافیکی از قبل کامل کار می‌کنه، فقط با باکس‌های رنگی placeholder به‌جای عکس واقعی.

برای گذاشتن عکس/صدای واقعی، ساده‌ترین و مطمئن‌ترین راه اینه که فایل‌ها رو یه‌جای دیگه آپلود کنی
(مثلاً یه ریپازیتوری گیت‌هاب دیگه به‌صورت public، یا Imgur، یا هر هاست عکس رایگان دیگه) و **لینک مستقیم**
فایل رو بگیری. بعد فقط فایل `src/webapp/shared/characterAssets.js` رو باز کن و به‌جای مسیرهای فعلی
(مثل `/assets/characters/werewolf/idle_1.png`)، همون لینک مستقیم رو بذار. مثلاً:

```js
idle: ["https://raw.githubusercontent.com/USERNAME/REPO/main/werewolf_idle_1.png"],
```

هیچ فایل دیگه‌ای (battleScene.js، index.html ها، wrangler.toml) نیاز به تغییر نداره - فقط همین یه فایل.

نکات فنی:
- عکس‌ها باید PNG با پس‌زمینه‌ی شفاف (آلفا) باشن، نه یه تصویر مربعی با پس‌زمینه‌ی خودشون
- دشمنان CPU (forest/dungeon) فقط عکس idle لازم دارن؛ حمله‌شون به‌جای انیمیشن اختصاصی، جلوه‌ی ساده (تکون/فلش) می‌گیره
- صداها اختیاری‌ان - اگه لینکش نباشه یا کار نکنه، فقط بی‌صدا رد میشه، خطا نمیده

(یه روش قبلی که امتحان کردیم - سرو کردن از پوشه‌ی `public` توی خودِ Worker - به‌خاطر یه تداخل مسیر
کنار گذاشته شد؛ اگه جایی به فایل یا تنظیمی درباره‌ی پوشه‌ی `public` برخوردی، دیگه لازم نیست.)
