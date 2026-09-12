import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { BOT_USERNAME } from "../../config/constants";

export async function replyGroupNotActive(ctx: Context, chatId: number): Promise<void> {
  const url = `https://t.me/${BOT_USERNAME}?start=activate_${chatId}`;
  const kb = new InlineKeyboard().url("🔑 فعال‌سازی در پیوی", url);

  await ctx.reply(
    "این گروه هنوز مجاز به استفاده از ربات نیست. روی دکمه‌ی زیر بزنید، در پیوی کد فعال‌سازی را وارد کنید و سپس دوباره این دستور را بفرستید.",
    { reply_markup: kb }
  );
}
