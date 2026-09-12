import type { Context } from "grammy";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

// این پیام رو خودِ ربات میفرسته و چون تلگرام هیچوقت پیام‌های خودِ ربات رو به‌عنوان
// آپدیت جدید بهش برنمیگردونه، نیازی به فیلتر اضافه نیست - ولی برای اطمینان،
// همه‌ی میدلوورهای دستوری (auth.ts و بقیه) باید فقط روی ctx.from های غیر-بات کار کنن.
const HINT_LINES: string[] = [
  "duel - مبارزه‌ی رودررو با یک بازیکن دیگه (فقط کارمند میتونه شروعش کنه)",
  "forest - مبارزه با حیوانات جنگل (مناسب مبتدی‌ها)",
  "dungeon - مبارزه با هیولاهای سخت‌تر (از لول ۵ به بالا)",
  "shop - خرید آرمور/سلاح/پوشن و کرفت کردن",
  "profile - نمایش شناسنامه‌ی شما",
  "جدول امتیازات (یا leaderboard) - ده نفر برتر از نظر برد",
  "hint - همین راهنما",
];

export async function handleHintCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }

  const body = HINT_LINES.map((l) => `• ${l}`).join("\n");
  await ctx.reply(`📖 راهنمای دستورات:\n\n${body}`);
}
