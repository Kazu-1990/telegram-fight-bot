import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { isStaff } from "../../config/constants";
import {
  getAllPlayersOrderedByUpdated,
  saveStaffListSession,
  getStaffListSession,
  deletePlayerCompletely,
} from "../../db/queries/staffList";
import { getPlayer } from "../../db/queries/players";

type D1 = any;

function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === "private";
}

// تلگرام هر پیام رو حداکثر ۴۰۹۶ کاراکتر قبول میکنه - برای اطمینان کمی کمتر از اون تیکه‌تیکه میکنیم
const MAX_MESSAGE_CHARS = 3500;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- /list ----------
export async function handleListCommand(ctx: Context, db: D1): Promise<void> {
  if (!isPrivateChat(ctx)) {
    await ctx.reply("این دستور فقط در پیوی ربات کار می‌کند.");
    return;
  }
  if (!isStaff(ctx.from!.id)) {
    await ctx.reply("فقط کارمند‌ها می‌توانند این دستور را اجرا کنند.");
    return;
  }

  const players = await getAllPlayersOrderedByUpdated(db);
  if (players.length === 0) {
    await ctx.reply("هنوز کسی ثبت‌نام نکرده است.");
    return;
  }

  // ترتیب دقیق همین لیست رو ذخیره میکنیم تا «حذف N» بدونه منظور کدوم بازیکنه
  await saveStaffListSession(
    db,
    ctx.from!.id,
    players.map((p) => p.telegramId)
  );

  const lines = players.map((p, i) => {
    const name = escapeHtml(p.name);
    return `${i + 1}. <a href="tg://user?id=${p.telegramId}">${name}</a> ${p.house}، ${p.race}`;
  });

  // تیکه‌تیکه کردن به چند پیام اگه لیست طولانی بود
  let chunk = "";
  const chunks: string[] = [];
  for (const line of lines) {
    if (chunk.length + line.length + 1 > MAX_MESSAGE_CHARS) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += (chunk ? "\n" : "") + line;
  }
  if (chunk) chunks.push(chunk);

  for (const part of chunks) {
    await ctx.reply(part, { parse_mode: "HTML" });
  }
}

// ---------- «حذف N» ----------
export async function handleDeleteByNumberStep(ctx: Context, db: D1, next: () => Promise<void>): Promise<void> {
  if (!isPrivateChat(ctx) || !ctx.message?.text) return next();

  const match = ctx.message.text.trim().match(/^حذف\s+(\d+)$/);
  if (!match) return next();

  if (!isStaff(ctx.from!.id)) return next(); // فقط کارمند این دستور رو داره، بقیه رو نادیده بگیر

  const index = Number(match[1]) - 1;
  const listSession = await getStaffListSession(db, ctx.from!.id);

  if (!listSession) {
    await ctx.reply("اول دستور /list رو بزن تا شماره‌ها مشخص بشن.");
    return;
  }
  if (index < 0 || index >= listSession.length) {
    await ctx.reply("این شماره توی آخرین /list وجود نداره.");
    return;
  }

  const targetId = listSession[index];
  const targetPlayer = await getPlayer(db, targetId);
  if (!targetPlayer) {
    await ctx.reply("این شخص دیگه توی ربات وجود نداره (شاید قبلاً حذف شده).");
    return;
  }

  const kb = new InlineKeyboard()
    .text("✅ بله", `staffdel_yes:${targetId}`)
    .text("❌ خیر", "staffdel_no");

  await ctx.reply(`آیا می‌خواهید ${targetPlayer.name} را از ربات حذف کنید؟`, { reply_markup: kb });
}

// ---------- تایید حذف ----------
export async function handleDeleteConfirmCallback(ctx: Context, db: D1): Promise<void> {
  if (!isStaff(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: "فقط کارمند‌ها می‌توانند این کار را انجام دهند." });
    return;
  }

  const targetId = Number(ctx.callbackQuery!.data!.split(":")[1]);
  const targetPlayer = await getPlayer(db, targetId);
  const name = targetPlayer?.name ?? "این شخص";

  await deletePlayerCompletely(db, targetId);

  await ctx.answerCallbackQuery({ text: "حذف شد." });
  await ctx.editMessageText(`✅ ${name} از ربات حذف شد. اگه بخواد دوباره بازی کنه، باید از اول ثبت‌نام کند.`);
}

// ---------- انصراف از حذف ----------
export async function handleDeleteCancelCallback(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("لغو شد؛ هیچ تغییری انجام نشد.");
}
