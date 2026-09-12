import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { HOUSES, RACES } from "../../config/constants";
import {
  ensurePlayerRow,
  isPlayerRegistered,
  completeRegistration,
  hasActiveListing,
  isPlayerBlocked,
} from "../../db/queries/players";
import {
  getRegistrationSession,
  startRegistrationSession,
  updateRegistrationSession,
  clearRegistrationSession,
} from "../../db/queries/registrationSessions";
import { GROUP_ACTIVATION_CODE } from "../../config/constants";
import { activateGroup } from "../../db/queries/groups";
import {
  setPendingGroupActivation,
  getPendingGroupActivation,
  clearPendingGroupActivation,
} from "../../db/queries/groupActivationSessions";

type D1 = any;

function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === "private";
}

// ---------- کیبوردها ----------

function startKeyboard(isRegistered: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  return isRegistered ? kb.text("✏️ ویرایش", "register_edit") : kb.text("📝 ثبت‌نام", "register_start");
}

function houseKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const h of HOUSES) kb.text(h, `house:${h}`).row();
  return kb;
}

function raceKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of RACES) kb.text(r, `race:${r}`).row();
  return kb;
}

// ---------- /start ----------
// نکته مهم: طبق طرح کلی، /start همچنین برای فعال‌سازی گروه استفاده میشه (گروه -> پیوی -> /start -> برگشت به گروه)
// اون بخش جدا در فایل groupActivation.ts پیاده میشه؛ اینجا فقط مسیر «/start در پیوی بدون آرگومان» رو هندل می‌کنیم
export async function handleStartCommand(ctx: Context, db: D1): Promise<void> {
  if (!isPrivateChat(ctx)) return; // /start در گروه رو groupActivation.ts هندل می‌کنه

  const userId = ctx.from!.id;

  if (await isPlayerBlocked(db, userId)) {
    await ctx.reply("⛔️ شما بلاک شده‌اید و نمی‌توانید از ربات استفاده کنید.");
    return;
  }

  await ensurePlayerRow(db, userId);

  // دیپ‌لینک فعال‌سازی گروه: https://t.me/<bot>?start=activate_<chatId>
  // وقتی از پیام «این گروه هنوز مجاز نیست» کلیک بشه، کاربر با این پارامتر وارد پیوی میشه
  const payload = (ctx.match as string) ?? "";
  if (payload.startsWith("activate_")) {
    const chatId = Number(payload.replace("activate_", ""));
    if (!Number.isNaN(chatId)) {
      await setPendingGroupActivation(db, userId, chatId);
      await ctx.reply("لطفاً کد فعال‌سازی گروه را ارسال کنید:");
      return;
    }
  }

  const registered = await isPlayerRegistered(db, userId);

  await ctx.reply(
    registered
      ? "به پیوی ربات خوش آمدید. برای مشاهده‌ی شناسنامه‌تون /profile رو بزنید، یا اطلاعاتتون رو ویرایش کنید:"
      : "به بازی خوش آمدید! برای شروع، ثبت‌نام کنید:",
    { reply_markup: startKeyboard(registered) }
  );
}

// ---------- شروع ویزارد (ثبت‌نام تازه) ----------
export async function handleRegisterStart(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;
  await ctx.answerCallbackQuery();

  await startRegistrationSession(db, userId);
  await ctx.reply("اسم خود را بدون نام خاندان بفرستید:");
}

// ---------- شروع ویزارد (ویرایش) ----------
export async function handleRegisterEdit(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;
  await ctx.answerCallbackQuery();

  // کسی که آیتمی برای فروش گذاشته و هنوز فروش نرفته/کنسل نشده، اجازه‌ی ویرایش ندارد
  if (await hasActiveListing(db, userId)) {
    await ctx.reply(
      "⚠️ شما یک آیتم فعال در بازار فروش دارید. تا وقتی که فروخته یا کنسل نشود، نمی‌توانید ویرایش کنید."
    );
    return;
  }

  await startRegistrationSession(db, userId);
  await ctx.reply(
    "در حال ویرایش پروفایل شما. سوابق بازی‌تون (لول، سکه، برد‌ها و...) دست نمی‌خورد.\n\n" +
      "اسم جدید خود را بدون نام خاندان بفرستید:"
  );
}

// ---------- مرحله‌ی وارد کردن کد فعال‌سازی گروه ----------
// این هندلر باید قبل از handleRegistrationTextStep چک بشه (هر دو متن پیوی رو میگیرن)
export async function handleGroupActivationCodeStep(ctx: Context, db: D1, next: () => Promise<void>): Promise<void> {
  if (!isPrivateChat(ctx) || !ctx.message?.text) return next();

  const userId = ctx.from!.id;
  const pendingChatId = await getPendingGroupActivation(db, userId);
  if (!pendingChatId) return next();

  const code = ctx.message.text.trim();
  if (code !== GROUP_ACTIVATION_CODE) {
    await ctx.reply("❌ کد اشتباه است. دوباره تلاش کنید:");
    return;
  }

  await activateGroup(db, pendingChatId, userId);
  await clearPendingGroupActivation(db, userId);
  await ctx.reply("✅ گروه فعال شد! حالا به گروه برگردید و دوباره همان دستور را بفرستید.");
}

// ---------- مرحله‌ی متنی (اسم) ----------
// این هندلر باید قبل از هندلرهای متنی دیگه (مثل duel/shop) چک شه؛ اگه سشن نبود، next() بزن
export async function handleRegistrationTextStep(ctx: Context, db: D1, next: () => Promise<void>): Promise<void> {
  if (!isPrivateChat(ctx) || !ctx.message?.text) return next();

  const userId = ctx.from!.id;
  const session = await getRegistrationSession(db, userId);
  if (!session || session.step !== "awaiting_name") return next();

  const name = ctx.message.text.trim();
  if (!name || name.length > 32) {
    await ctx.reply("اسم نامعتبر است. لطفاً یک اسم کوتاه‌تر (بدون خاندان) بفرستید:");
    return;
  }

  await updateRegistrationSession(db, userId, "awaiting_house", { ...session.data, name });
  await ctx.reply("خاندان خود را انتخاب کنید:", { reply_markup: houseKeyboard() });
}

// ---------- مرحله‌ی انتخاب خاندان ----------
export async function handleHouseSelection(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;
  const session = await getRegistrationSession(db, userId);
  if (!session || session.step !== "awaiting_house") {
    await ctx.answerCallbackQuery({ text: "این مرحله منقضی شده." });
    return;
  }

  const house = ctx.callbackQuery!.data!.split(":")[1]; // از callback_data: house:stalker -> "stalker"
  await ctx.answerCallbackQuery();

  await updateRegistrationSession(db, userId, "awaiting_race", { ...session.data, house });
  await ctx.editMessageText("نژاد خود را انتخاب کنید:", { reply_markup: raceKeyboard() });
}

// ---------- مرحله‌ی انتخاب نژاد ----------
export async function handleRaceSelection(ctx: Context, db: D1): Promise<void> {
  const userId = ctx.from!.id;
  const session = await getRegistrationSession(db, userId);
  if (!session || session.step !== "awaiting_race") {
    await ctx.answerCallbackQuery({ text: "این مرحله منقضی شده." });
    return;
  }

  const race = ctx.callbackQuery!.data!.split(":")[1];
  await ctx.answerCallbackQuery();

  await updateRegistrationSession(db, userId, "awaiting_photo", { ...session.data, race });
  await ctx.editMessageText("یک عکس برای شخصیت خود بفرستید (این عکس در پروفایل شما نمایش داده می‌شود):");
}

// ---------- مرحله‌ی عکس (پایان ویزارد) ----------
export async function handleRegistrationPhotoStep(ctx: Context, db: D1, next: () => Promise<void>): Promise<void> {
  if (!isPrivateChat(ctx) || !ctx.message?.photo) return next();

  const userId = ctx.from!.id;
  const session = await getRegistrationSession(db, userId);
  if (!session || session.step !== "awaiting_photo") return next();

  // بالاترین کیفیت عکس آخرین آیتم آرایه‌ی photo است
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;

  const { name, house, race } = session.data;
  if (!name || !house || !race) {
    // نباید پیش بیاد، ولی برای اطمینان
    await clearRegistrationSession(db, userId);
    await ctx.reply("مشکلی پیش آمد، لطفاً ثبت‌نام را دوباره شروع کنید.");
    return;
  }

  await completeRegistration(db, userId, {
    name,
    house: house as any,
    race: race as any,
    photoFileId: fileId,
  });
  await clearRegistrationSession(db, userId);

  await ctx.reply(
    `✅ ثبت‌نام تکمیل شد!\n\nنام: ${name}\nخاندان: ${house}\nنژاد: ${race}\n\nبرای مشاهده‌ی شناسنامه، /profile را بزنید.`
  );
}
