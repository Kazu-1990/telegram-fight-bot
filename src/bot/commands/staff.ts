import type { Context } from "grammy";
import { isStaff } from "../../config/constants";
import { blockPlayer, unblockPlayer } from "../../db/queries/players";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

function getReplyTargetId(ctx: Context): number | null {
  return ctx.message?.reply_to_message?.from?.id ?? null;
}

export async function handleBlockCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }
  if (!isStaff(ctx.from!.id)) {
    await ctx.reply("فقط کارمند‌ها می‌توانند این دستور را اجرا کنند.");
    return;
  }
  const targetId = getReplyTargetId(ctx);
  if (!targetId) {
    await ctx.reply("برای بلاک کردن، باید روی پیام شخص مورد نظر ریپلای کنید.");
    return;
  }

  await blockPlayer(db, targetId, "manual");
  await ctx.reply("⛔️ این شخص بلاک شد و تا آنبلاک شدن نمی‌تواند از ربات استفاده کند.");
}

export async function handleUnblockCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }
  if (!isStaff(ctx.from!.id)) {
    await ctx.reply("فقط کارمند‌ها می‌توانند این دستور را اجرا کنند.");
    return;
  }
  const targetId = getReplyTargetId(ctx);
  if (!targetId) {
    await ctx.reply("برای آنبلاک کردن، باید روی پیام شخص مورد نظر ریپلای کنید.");
    return;
  }

  await unblockPlayer(db, targetId);
  await ctx.reply("✅ این شخص آنبلاک شد.");
}
