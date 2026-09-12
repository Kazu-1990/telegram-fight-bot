import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { isStaff, WEBAPP_BASE_URL, WEBAPP_PATHS, DUEL_WAITING_EXPIRY_MS } from "../../config/constants";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";
import { getPlayer, isPlayerBlocked, isPlayerRegistered } from "../../db/queries/players";
import { getEquippedGear } from "../../db/queries/inventory";
import {
  createWaitingDuelMatch,
  setGroupMessageId,
  joinDuelMatch,
  getMatch,
  cancelMatch,
  isWaitingExpired,
  expireMatch,
  setMatchState,
  finishDuelMatch,
} from "../../db/queries/matches";
import { createFighterState, createCombatState } from "../../game/combat/engine";
import type { CombatState } from "../../types";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

function inviteKeyboard(matchId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("⚔️ ورود به مبارزه", `duel_join:${matchId}`)
    .row()
    .text("🚫 کنسل (کارمند)", `duel_cancel:${matchId}`);
}

function activeMatchGroupKeyboard(matchId: number): InlineKeyboard {
  // اینجا دیگه دکمه‌ی مینی‌اپ نداریم - web_app توی گروه مجاز نیست (BUTTON_TYPE_INVALID)
  return new InlineKeyboard().text("🚫 کنسل (کارمند)", `duel_cancel:${matchId}`);
}

function pvDuelKeyboard(matchId: number): InlineKeyboard {
  const url = `${WEBAPP_BASE_URL}${WEBAPP_PATHS.duel}?matchId=${matchId}`;
  return new InlineKeyboard().webApp("🎮 ادامه در مینی‌اپ", url);
}

// ---------- /duel (فقط کارمند مجاز به شروع کردن این دستوره) ----------
export async function handleDuelCommand(ctx: Context, db: D1): Promise<void> {
  if (!isGroupChat(ctx)) {
    await ctx.reply("این دستور فقط داخل گروه کار می‌کند.");
    return;
  }

  if (!isStaff(ctx.from!.id)) {
    await ctx.reply("فقط کارمند‌ها می‌توانند مبارزه اعلام کنند.");
    return;
  }

  const chatId = ctx.chat!.id;
  if (!(await isGroupActive(db, chatId))) {
    await replyGroupNotActive(ctx, chatId);
    return;
  }

  const userId = ctx.from!.id;
  if (await isPlayerBlocked(db, userId)) {
    await ctx.reply("⛔️ شما بلاک شده‌اید.");
    return;
  }

  const matchId = await createWaitingDuelMatch(db, chatId);
  const sent = await ctx.reply(
    "⚔️ یک مبارزه اعلام شد! دو نفر اول که وارد شوند حریف خواهند بود.",
    { reply_markup: inviteKeyboard(matchId) }
  );
  await setGroupMessageId(db, matchId, sent.message_id);
}

// ---------- دکمه‌ی ورود به مبارزه ----------
export async function handleDuelJoinCallback(ctx: Context, db: D1): Promise<void> {
  const matchId = Number(ctx.callbackQuery!.data!.split(":")[1]);
  const userId = ctx.from!.id;

  const match = await getMatch(db, matchId);
  if (!match) {
    await ctx.answerCallbackQuery({ text: "این مبارزه پیدا نشد." });
    return;
  }

  if (isWaitingExpired(match, DUEL_WAITING_EXPIRY_MS)) {
    await expireMatch(db, matchId);
    await ctx.answerCallbackQuery({ text: "این مبارزه منقضی شده است." });
    await ctx.editMessageText("⌛️ این مبارزه به دلیل نیامدن حریف، منقضی شد.");
    return;
  }

  if (await isPlayerBlocked(db, userId)) {
    await ctx.answerCallbackQuery({ text: "شما بلاک شده‌اید." });
    return;
  }
  if (!(await isPlayerRegistered(db, userId))) {
    await ctx.answerCallbackQuery({ text: "اول باید در پیوی ربات ثبت‌نام کنید." });
    return;
  }

  const result = await joinDuelMatch(db, matchId, userId);

  if (result.outcome === "already_joined") {
    await ctx.answerCallbackQuery({ text: "شما همین الان توی این مبارزه هستید." });
    return;
  }
  if (result.outcome === "full" || result.outcome === "not_waiting") {
    await ctx.answerCallbackQuery({ text: "ظرفیت این مبارزه پر شده است." });
    return;
  }

  if (result.outcome === "joined_as_first") {
    await ctx.answerCallbackQuery({ text: "شما به عنوان حریف اول وارد شدید. منتظر نفر دوم..." });
    return;
  }

  // joined_as_second -> بازی شروع میشه: هر دو فایتر رو با اطلاعات واقعی می‌سازیم
  const finalMatch = result.match;
  const p1 = await getPlayer(db, finalMatch.player1Id!);
  const p2 = await getPlayer(db, finalMatch.player2Id!);

  if (!p1 || !p2 || !p1.race || !p2.race) {
    await ctx.answerCallbackQuery({ text: "خطا در بارگذاری اطلاعات بازیکن‌ها." });
    return;
  }

  const gear1 = await getEquippedGear(db, p1.telegramId);
  const gear2 = await getEquippedGear(db, p2.telegramId);

  const f1 = createFighterState(p1.telegramId, p1.race, { hpMax: p1.hpMax, ...gear1 });
  const f2 = createFighterState(p2.telegramId, p2.race, { hpMax: p2.hpMax, ...gear2 });
  const state: CombatState = createCombatState(f1, f2);
  await setMatchState(db, matchId, state);

  await ctx.answerCallbackQuery({ text: "حریف دوم پیدا شد! مبارزه شروع می‌شود." });
  await ctx.editMessageText(
    `⚔️ مبارزه بین ${p1.name} و ${p2.name} شروع شد!\nبرای هرکدوم پیوی فرستادم تا وارد مینی‌اپ شوند.`,
    { reply_markup: activeMatchGroupKeyboard(matchId) }
  );

  // چون دکمه‌ی web_app توی گروه کار نمی‌کنه، به هر دو نفر جدا پیوی می‌فرستیم
  for (const p of [p1, p2]) {
    try {
      await ctx.api.sendMessage(p.telegramId, "⚔️ مبارزه‌ی شما شروع شد! برای ادامه روی دکمه بزن:", {
        reply_markup: pvDuelKeyboard(matchId),
      });
    } catch {
      // اگه کسی هیچوقت پیوی ربات رو استارت نکرده باشه، پیام نمیره - این یعنی باید اول ثبت‌نام میشد
      // (که طبق منطق بازی نباید پیش بیاد، چون ورود به duel نیاز به ثبت‌نام قبلی داره)
    }
  }
}

// ---------- دکمه‌ی کنسل (فقط کارمند) ----------
export async function handleDuelCancelCallback(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;
  if (!isStaff(userId)) {
    await ctx.answerCallbackQuery({ text: "فقط کارمند‌ها می‌توانند این کار را انجام دهند." });
    return;
  }

  const matchId = Number(ctx.callbackQuery!.data!.split(":")[1]);
  const match = await getMatch(db, matchId);
  if (!match || match.status === "finished" || match.status === "cancelled") {
    await ctx.answerCallbackQuery({ text: "این مبارزه قابل کنسل کردن نیست." });
    return;
  }

  await cancelMatch(db, matchId);
  await ctx.answerCallbackQuery({ text: "مبارزه کنسل شد." });
  await ctx.editMessageText("🚫 این مبارزه توسط یک کارمند کنسل شد. هیچ تغییری ثبت نشد.");
}

const HOUSE_LABELS: Record<string, string> = { stalker: "Stalker", evans: "Evans", scott: "Scott" };

// این تابع توسط API مینی‌اپ صدا زده میشه، وقتی combat engine اعلام کرد بازی برنده دارد.
// کار این تابع: ثبت برد در دیتابیس + آپدیت مستقیم پیام گروه با جزئیات نتیجه (بدون نیاز به کلیک)
export async function closeDuelMatch(
  bot: { api: { editMessageText: (chatId: number, messageId: number, text: string, opts?: any) => Promise<unknown> } },
  db: D1,
  matchId: number,
  winnerId: number
): Promise<void> {
  const match = await getMatch(db, matchId);
  if (!match || match.status === "finished") return;

  await finishDuelMatch(db, matchId, winnerId);

  if (!match.chatId || !match.groupMessageId) return;

  const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
  const winner = await getPlayer(db, winnerId);
  const loser = loserId ? await getPlayer(db, loserId) : null;

  // جزئیات نبرد (HP نهایی، تعداد راند، خلاصه‌ی رویدادها) از state ذخیره‌شده میاد
  const state = match.state as any;
  const winnerFighter = state?.fighters?.find((f: any) => f.id === winnerId);
  const loserFighter = state?.fighters?.find((f: any) => f.id === loserId);

  const lines = [
    "⚔️ مبارزه به پایان رسید!",
    "",
    `🏆 برنده: ${winner?.name ?? winnerId} (${HOUSE_LABELS[winner?.house ?? ""] ?? winner?.house ?? "-"}, ${winner?.race ?? "-"})`,
    `💀 بازنده: ${loser?.name ?? loserId ?? "?"} (${HOUSE_LABELS[loser?.house ?? ""] ?? loser?.house ?? "-"}, ${loser?.race ?? "-"})`,
  ];

  if (state?.round) lines.push("", `📊 تعداد راند: ${state.round}`);
  if (winnerFighter) lines.push(`❤️ HP نهایی برنده: ${Math.max(0, winnerFighter.hp)}/${winnerFighter.hpMax}`);
  if (loserFighter) lines.push(`💔 HP نهایی بازنده: ${Math.max(0, loserFighter.hp)}/${loserFighter.hpMax}`);

  if (Array.isArray(state?.log) && state.log.length > 0) {
    const summary = state.log.slice(-5).join("\n");
    lines.push("", "📝 خلاصه‌ی نبرد:", summary);
  }

  await bot.api.editMessageText(match.chatId, match.groupMessageId, lines.join("\n"));
}
