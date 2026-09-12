import type { Context } from "grammy";
import { isStaff } from "../../config/constants";
import { getTopPlayers, resetSeasonWins } from "../../db/queries/leaderboard";
import { adjustLeagueStars } from "../../db/queries/players";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

const HOUSE_LABELS: Record<string, string> = { stalker: "Stalker", evans: "Evans", scott: "Scott" };

// این تابع هم با متن دقیق «جدول امتیازات» و هم با دستور /leaderboard فراخوانی میشه
// (سیم‌کشی نهایی‌ش - یعنی bot.hears("جدول امتیازات", ...) و bot.command("leaderboard", ...) -
// هر دو به همین یک تابع وصل میشن، توی فاز اتصال نهایی بات)
export async function handleLeaderboardCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }

  const top = await getTopPlayers(db, 10);

  if (top.length === 0) {
    await ctx.reply("هنوز کسی در جدول امتیازات ثبت نشده است.");
    return;
  }

  const lines = top.map(
    (p, i) => `${i + 1}. ${p.name ?? "?"} (${HOUSE_LABELS[p.house ?? ""] ?? p.house ?? "-"}, ${p.race ?? "-"}) — ${p.seasonWins} برد`
  );

  await ctx.reply(`🏆 جدول امتیازات (۱۰ نفر برتر):\n\n${lines.join("\n")}`);
}

// ---------- /resetboard (فقط کارمند) ----------
export async function handleResetboardCommand(ctx: Context, db: D1): Promise<void> {
  if (isGroupChat(ctx) && !(await isGroupActive(db, ctx.chat!.id))) {
    await replyGroupNotActive(ctx, ctx.chat!.id);
    return;
  }
  if (!isStaff(ctx.from!.id)) {
    await ctx.reply("فقط کارمند‌ها می‌توانند این دستور را اجرا کنند.");
    return;
  }

  await resetSeasonWins(db);
  await ctx.reply("✅ جدول امتیازات ریست شد. (تعداد برد کلی در پروفایل‌ها دست نخورده باقی ماند)");
}

function getReplyTargetId(ctx: Context): number | null {
  return ctx.message?.reply_to_message?.from?.id ?? null;
}

// ---------- /star (فقط کارمند، باید ریپلای به شخص باشه) ----------
export async function handleStarCommand(ctx: Context, db: D1): Promise<void> {
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
    await ctx.reply("برای استفاده از این دستور، باید روی پیام شخص مورد نظر ریپلای کنید.");
    return;
  }

  await adjustLeagueStars(db, targetId, 1);
  await ctx.reply("⭐️ یک ستاره‌ی لیگ به این شخص اضافه شد.");
}

// ---------- /antistar (فقط کارمند، باید ریپلای به شخص باشه) ----------
export async function handleAntiStarCommand(ctx: Context, db: D1): Promise<void> {
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
    await ctx.reply("برای استفاده از این دستور، باید روی پیام شخص مورد نظر ریپلای کنید.");
    return;
  }

  await adjustLeagueStars(db, targetId, -1);
  await ctx.reply("➖ یک ستاره‌ی لیگ از این شخص کم شد.");
}
