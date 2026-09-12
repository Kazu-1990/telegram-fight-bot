import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { WEBAPP_BASE_URL, WEBAPP_PATHS } from "../../config/constants";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";
import { isPlayerBlocked, isPlayerRegistered } from "../../db/queries/players";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

function shopKeyboard(): InlineKeyboard {
  return new InlineKeyboard().webApp("🛒 ورود به شاپ", `${WEBAPP_BASE_URL}${WEBAPP_PATHS.shop}`);
}

export async function handleShopCommand(ctx: Context, db: D1): Promise<void> {
  if (!isGroupChat(ctx)) {
    await ctx.reply("این دستور فقط داخل گروه کار می‌کند.");
    return;
  }

  if (!(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }

  const userId = ctx.from!.id;
  if (await isPlayerBlocked(db, userId)) {
    await ctx.reply("⛔️ شما بلاک شده‌اید.");
    return;
  }
  if (!(await isPlayerRegistered(db, userId))) {
    await ctx.reply("اول باید در پیوی ربات ثبت‌نام کنید.");
    return;
  }

  await ctx.reply("🛒 شاپ باز است! هرکس وارد شود، فقط اینونتوری و بازار خودش را می‌بیند.", {
    reply_markup: shopKeyboard(),
  });
}
