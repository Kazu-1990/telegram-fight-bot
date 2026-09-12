import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { WEBAPP_BASE_URL, WEBAPP_PATHS } from "../../config/constants";
import { isGroupActive } from "../../db/queries/groups";
import { replyGroupNotActive } from "../shared/groupActivationPrompt";
import { getPlayer, isPlayerBlocked, isPlayerRegistered } from "../../db/queries/players";

type D1 = any;

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

// دکمه‌ی نوع web_app توی تلگرام فقط توی پیوی مجازه، نه توی گروه (وگرنه خطای
// BUTTON_TYPE_INVALID میده) - پس توی گروه فقط یه دکمه‌ی معمولی میذاریم
function groupEntryKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("🌲 ورود به جنگل", "forest_enter");
}

function pvWebAppKeyboard(): InlineKeyboard {
  return new InlineKeyboard().webApp("🌲 شروع مبارزه", `${WEBAPP_BASE_URL}${WEBAPP_PATHS.forest}`);
}

function formatRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  return `${minutes} دقیقه`;
}

export async function handleForestCommand(ctx: Context, db: D1): Promise<void> {
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

  // فقط برای فیدبک سریع به کسی که دستور رو زده - چک نهایی و قطعی موقع "شروع مبارزه" در مینی‌اپ انجام میشه
  // چون این پیام رو هرکسی دیگه‌ای هم توی گروه می‌تونه بزنه
  const player = await getPlayer(db, userId);
  if (player?.forestCooldownUntil && player.forestCooldownUntil > Date.now()) {
    await ctx.reply(`شما اخیراً باخته‌اید. ${formatRemaining(player.forestCooldownUntil - Date.now())} دیگر صبر کنید.`);
    return;
  }

  await ctx.reply(
    "🌲 جنگل منتظر شماست! هرکس که وارد شود، مبارزه‌ی شخصی خودش را انجام می‌دهد.",
    { reply_markup: groupEntryKeyboard() }
  );
}

// ---------- کلیک روی دکمه‌ی گروه - چک نهایی + فرستادن دکمه‌ی واقعی مینی‌اپ در پیوی ----------
export async function handleForestEnterCallback(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;

  if (await isPlayerBlocked(db, userId)) {
    await ctx.answerCallbackQuery({ text: "شما بلاک شده‌اید." });
    return;
  }
  if (!(await isPlayerRegistered(db, userId))) {
    await ctx.answerCallbackQuery({ text: "اول باید در پیوی ربات ثبت‌نام کنید." });
    return;
  }

  const player = await getPlayer(db, userId);
  if (player?.forestCooldownUntil && player.forestCooldownUntil > Date.now()) {
    await ctx.answerCallbackQuery({
      text: `شما اخیراً باخته‌اید. ${formatRemaining(player.forestCooldownUntil - Date.now())} دیگر صبر کنید.`,
      show_alert: true,
    });
    return;
  }

  try {
    await ctx.api.sendMessage(userId, "🌲 برای شروع مبارزه با جنگل روی دکمه بزن:", {
      reply_markup: pvWebAppKeyboard(),
    });
    await ctx.answerCallbackQuery({ text: "به پیوی‌تون پیام دادم، اونجا رو چک کنید." });
  } catch {
    await ctx.answerCallbackQuery({
      text: "اول باید یک‌بار در پیوی ربات /start بزنید تا بتونم بهتون پیام بدم.",
      show_alert: true,
    });
  }
}
