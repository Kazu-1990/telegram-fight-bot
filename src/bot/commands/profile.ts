import type { Context } from "grammy";
import { getPlayer, isPlayerBlocked } from "../../db/queries/players";
import { getEquippedGear, getInventoryByType } from "../../db/queries/inventory";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

function formatList(items: { itemKey: string; quantity: number }[]): string {
  if (items.length === 0) return "خالی";
  return items.map((i) => `${i.itemKey} ×${i.quantity}`).join("، ");
}

export async function handleProfileCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }

  const userId = ctx.from!.id;

  if (await isPlayerBlocked(db, userId)) {
    await ctx.reply("⛔️ شما بلاک شده‌اید.");
    return;
  }

  const player = await getPlayer(db, userId);
  if (!player || !player.isRegistered) {
    await ctx.reply("شما هنوز ثبت‌نام نکرده‌اید. اول در پیوی ربات ثبت‌نام کنید.");
    return;
  }

  const gear = await getEquippedGear(db, userId);
  const potions = await getInventoryByType(db, userId, "potion");
  const resources = await getInventoryByType(db, userId, "resource");

  const caption = [
    `👤 ${player.name}${player.title ? ` «${player.title}»` : ""}`,
    `🏠 خاندان: ${player.house}`,
    `🧬 نژاد: ${player.race}`,
    `⭐️ لول: ${player.level} (XP: ${player.xp})`,
    `🛡 آرمور: ${gear.armorKey ?? "ندارد"}`,
    `🗡 سلاح: ${gear.weaponKey ?? "ندارد"}`,
    `🧪 پوشن‌های فعلی: ${formatList(potions)}`,
    `🎒 Inventory (منابع): ${formatList(resources)}`,
    `🏆 تعداد برد (کلی): ${player.totalWins}`,
    `👑 برنده‌ی لیگ: ${player.leagueStars} بار`,
  ].join("\n");

  if (player.photoFileId) {
    await ctx.replyWithPhoto(player.photoFileId, { caption });
  } else {
    await ctx.reply(caption);
  }
}
