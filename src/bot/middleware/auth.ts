import type { Context, NextFunction } from "grammy";
import { isPlayerBlocked } from "../../db/queries/players";
import { checkAndRecordSpam } from "./antispam";

type D1 = any;

// فعلاً «دستور» یعنی هر متنی که با / شروع بشه، یا عبارت خاص «جدول امتیازات»
// (اگه بعداً دستور متنی دیگه‌ای اضافه شد، همینجا اضافه‌ش کن)
function isCommandLike(text: string | undefined): boolean {
  if (!text) return false;
  return text.startsWith("/") || text.trim() === "جدول امتیازات";
}

export function authAndAntiSpamMiddleware(db: D1) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    // چک صریح: هیچوقت به پیام‌های خود بات (یا هر بات دیگه) واکنش نشون نده
    // (مثلا وقتی /hint لیست دستورها رو میفرسته، نباید این پیام دوباره پردازش بشه)
    if (ctx.from?.is_bot) return;

    const text = ctx.message?.text;
    if (!isCommandLike(text) || !ctx.from) {
      return next();
    }

    const userId = ctx.from.id;

    if (await isPlayerBlocked(db, userId)) {
      await ctx.reply("⛔️ شما بلاک شده‌اید و نمی‌توانید از ربات استفاده کنید.");
      return; // next() صدا زده نمیشه - هیچ هندلر دیگه‌ای اجرا نمیشه
    }

    const justBlocked = await checkAndRecordSpam(db, userId, text!.split(" ")[0]);
    if (justBlocked) {
      await ctx.reply("🚫 شما به دلیل اسپم کردن دستورات، بلاک شدید. فقط یک کارمند می‌تواند شما را آنبلاک کند.");
      return;
    }

    return next();
  };
}
