import { Bot, webhookCallback } from "grammy";
import type { Context } from "grammy";

import { authAndAntiSpamMiddleware } from "./middleware/auth";
import * as registration from "./commands/registration";
import * as duel from "./commands/duel";
import * as forest from "./commands/forest";
import * as dungeon from "./commands/dungeon";
import * as shop from "./commands/shop";
import * as profile from "./commands/profile";
import * as leaderboard from "./commands/leaderboard";
import * as staff from "./commands/staff";
import * as staffList from "./commands/staffList";
import * as hint from "./commands/hint";
import { normalizePersianText } from "./shared/text";

import { handleDuelApiRequest } from "../webapp/duel/routes";
import { handlePveApiRequest } from "../webapp/pve/routes";
import { handleShopApiRequest } from "../webapp/shop/routes";

// این سه import متنی نیاز به rule توی wrangler.toml دارن (فقط html)
// js/css موتور گرافیک دیگه فایل جدا نیستن - مستقیم داخل همین دو html اینلاین شدن
import DUEL_HTML from "../webapp/duel/index.html";
import PVE_HTML from "../webapp/pve/index.html";
import SHOP_HTML from "../webapp/shop/index.html";

type D1 = any;

export interface Env {
  DB: D1;
  BOT_TOKEN: string;
  // بخشی مخفی از مسیر وبهوک، تا هرکسی نتونه به فرم‌دیتای وبهوک دسترسی داشته باشه
  BOT_WEBHOOK_SECRET: string;
}

function buildBot(env: Env): Bot<Context> {
  const bot = new Bot<Context>(env.BOT_TOKEN);
  const db = env.DB;

  // میدلوور اصلی - همیشه باید اول از همه نصب بشه (چک بلاک بودن + ضدِ اسپم)
  bot.use(authAndAntiSpamMiddleware(db));

  // ---------- /start (ثبت‌نام یا دیپ‌لینک فعال‌سازی گروه) ----------
  bot.command("start", (ctx) => registration.handleStartCommand(ctx, db));

  // ---------- مراحل متنی/عکسی پیوی - ترتیب مهمه چون هر دو message:text رو میگیرن ----------
  bot.on("message:text", (ctx, next) => registration.handleGroupActivationCodeStep(ctx, db, next));
  bot.on("message:text", (ctx, next) => registration.handleRegistrationTextStep(ctx, db, next));
  bot.on("message:photo", (ctx, next) => registration.handleRegistrationPhotoStep(ctx, db, next));

  // ---------- دکمه‌های ویزارد ثبت‌نام ----------
  bot.callbackQuery("register_start", (ctx) => registration.handleRegisterStart(ctx, db));
  bot.callbackQuery("register_edit", (ctx) => registration.handleRegisterEdit(ctx, db));
  bot.callbackQuery(/^house:/, (ctx) => registration.handleHouseSelection(ctx, db));
  bot.callbackQuery(/^race:/, (ctx) => registration.handleRaceSelection(ctx, db));

  // ---------- duel ----------
  bot.command("duel", (ctx) => duel.handleDuelCommand(ctx, db));
  bot.callbackQuery(/^duel_join:\d+$/, (ctx) => duel.handleDuelJoinCallback(ctx, db));
  bot.callbackQuery(/^duel_cancel:\d+$/, (ctx) => duel.handleDuelCancelCallback(ctx, db));

  // ---------- forest / dungeon / shop / profile / hint ----------
  bot.command("forest", (ctx) => forest.handleForestCommand(ctx, db));
  bot.callbackQuery("forest_enter", (ctx) => forest.handleForestEnterCallback(ctx, db));
  bot.command("dungeon", (ctx) => dungeon.handleDungeonCommand(ctx, db));
  bot.callbackQuery("dungeon_enter", (ctx) => dungeon.handleDungeonEnterCallback(ctx, db));
  bot.command("shop", (ctx) => shop.handleShopCommand(ctx, db));
  bot.callbackQuery("shop_enter", (ctx) => shop.handleShopEnterCallback(ctx, db));
  bot.command("profile", (ctx) => profile.handleProfileCommand(ctx, db));
  bot.command("hint", (ctx) => hint.handleHintCommand(ctx, db));

  // ---------- جدول امتیازات (فارسی + معادل انگلیسی /leaderboard) ----------
  bot.command("leaderboard", (ctx) => leaderboard.handleLeaderboardCommand(ctx, db));
  bot.on("message:text", (ctx, next) => {
    if (normalizePersianText(ctx.message.text) === "جدول امتیازات") {
      return leaderboard.handleLeaderboardCommand(ctx, db);
    }
    return next();
  });

  // ---------- دستورات کارمندی ----------
  bot.command("resetboard", (ctx) => leaderboard.handleResetboardCommand(ctx, db));
  bot.command("star", (ctx) => leaderboard.handleStarCommand(ctx, db));
  bot.command("antistar", (ctx) => leaderboard.handleAntiStarCommand(ctx, db));
  bot.command("block", (ctx) => staff.handleBlockCommand(ctx, db));
  bot.command("unblock", (ctx) => staff.handleUnblockCommand(ctx, db));

  // ---------- /list و حذف کامل بازیکن (فقط کارمند، فقط پیوی) ----------
  bot.command("list", (ctx) => staffList.handleListCommand(ctx, db));
  bot.on("message:text", (ctx, next) => staffList.handleDeleteByNumberStep(ctx, db, next));
  bot.callbackQuery(/^staffdel_yes:\d+$/, (ctx) => staffList.handleDeleteConfirmCallback(ctx, db));
  bot.callbackQuery("staffdel_no", (ctx) => staffList.handleDeleteCancelCallback(ctx));

  return bot;
}

function serveHtml(html: string): Response {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ---------- API مینی‌اپ duel ----------
    if (url.pathname.startsWith("/api/duel/")) {
      const bot = buildBot(env);
      const subPath = url.pathname.replace("/api/duel/", "");
      return handleDuelApiRequest(request, { DB: env.DB, BOT_TOKEN: env.BOT_TOKEN, bot }, subPath);
    }

    // ---------- API مینی‌اپ forest/dungeon (مشترک) ----------
    if (url.pathname.startsWith("/api/forest/")) {
      const subPath = url.pathname.replace("/api/forest/", "");
      return handlePveApiRequest(request, { DB: env.DB, BOT_TOKEN: env.BOT_TOKEN }, "forest", subPath);
    }
    if (url.pathname.startsWith("/api/dungeon/")) {
      const subPath = url.pathname.replace("/api/dungeon/", "");
      return handlePveApiRequest(request, { DB: env.DB, BOT_TOKEN: env.BOT_TOKEN }, "dungeon", subPath);
    }

    // ---------- API مینی‌اپ shop ----------
    if (url.pathname.startsWith("/api/shop/")) {
      const subPath = url.pathname.replace("/api/shop/", "");
      return handleShopApiRequest(request, { DB: env.DB, BOT_TOKEN: env.BOT_TOKEN }, subPath);
    }

    // ---------- صفحات استاتیک مینی‌اپ‌ها (همون آدرس‌هایی که WEBAPP_PATHS در constants.ts تعریف کرده) ----------
    if (request.method === "GET") {
      if (url.pathname === "/duel") return serveHtml(DUEL_HTML);
      if (url.pathname === "/forest" || url.pathname === "/dungeon") return serveHtml(PVE_HTML);
      if (url.pathname === "/shop") return serveHtml(SHOP_HTML);
    }

    // ---------- وبهوک تلگرام ----------
    // آدرس وبهوک رو موقع ست‌کردن روی تلگرام دقیقاً همینو بده: https://<workers-domain>/telegram-webhook/<SECRET>
    if (url.pathname === `/telegram-webhook/${env.BOT_WEBHOOK_SECRET}`) {
      const bot = buildBot(env);
      return webhookCallback(bot, "cloudflare-mod")(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
