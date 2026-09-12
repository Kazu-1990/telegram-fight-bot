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

## نکته‌ی مهم درباره‌ی گیت‌هاب + Cloudflare
اگه از داشبورد Cloudflare گزینه‌ی "Connect to Git" رو برای این Worker استفاده می‌کنی، فایل `wrangler.toml`
همینجا توی ریشه‌ی پروژه باید بمونه - Cloudflare خودش هنگام push به شاخه‌ی اصلی، build و deploy رو انجام میده.
