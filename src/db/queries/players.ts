import type { Player, House, Race } from "../../types";

// نوع D1Database از Cloudflare Workers میاد - اینجا برای سادگی any می‌گیریم
// تا وابسته به @cloudflare/workers-types نباشیم در این فایل مستقل
type D1 = any;

function now(): number {
  return Date.now();
}

function rowToPlayer(row: any): Player {
  return {
    telegramId: row.telegram_id,
    isRegistered: !!row.is_registered,
    name: row.name,
    house: row.house,
    race: row.race,
    photoFileId: row.photo_file_id,
    title: row.title,
    level: row.level,
    xp: row.xp,
    coinsFc: row.coins_fc,
    hpMax: row.hp_max,
    totalWins: row.total_wins,
    seasonWins: row.season_wins,
    leagueStars: row.league_stars,
    forestWinsTotal: row.forest_wins_total,
    dungeonWinsTotal: row.dungeon_wins_total,
    isBlocked: !!row.is_blocked,
    blockReason: row.block_reason,
    forestCooldownUntil: row.forest_cooldown_until,
    dungeonCooldownUntil: row.dungeon_cooldown_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPlayer(db: D1, telegramId: number): Promise<Player | null> {
  const row = await db
    .prepare("SELECT * FROM players WHERE telegram_id = ?")
    .bind(telegramId)
    .first();
  return row ? rowToPlayer(row) : null;
}

// وقتی کاربر اولین بار دکمه‌ی ثبت‌نام رو میزنه، یه ردیف پایه براش می‌سازیم
// (اگه از قبل وجود داشته باشه، دست نمی‌زنیم بهش - برای جلوگیری از پاک شدن دیتای قبلی)
export async function ensurePlayerRow(db: D1, telegramId: number): Promise<void> {
  const existing = await getPlayer(db, telegramId);
  if (existing) return;

  const t = now();
  await db
    .prepare(
      `INSERT INTO players (telegram_id, is_registered, level, xp, coins_fc, hp_max,
        total_wins, season_wins, league_stars, forest_wins_total, dungeon_wins_total,
        is_blocked, has_active_listing, created_at, updated_at)
       VALUES (?, 0, 1, 0, 0, 200, 0, 0, 0, 0, 0, 0, 0, ?, ?)`
    )
    .bind(telegramId, t, t)
    .run();
}

export async function isPlayerRegistered(db: D1, telegramId: number): Promise<boolean> {
  const p = await getPlayer(db, telegramId);
  return !!p?.isRegistered;
}

// تکمیل ثبت‌نام یا ویرایش - چون آیدی عددی ثابته، سابقه (لول/xp/coins/wins/stars) دست نمی‌خوره
// فقط فیلدهای هویتی (اسم/خاندان/نژاد/عکس) آپدیت میشن
export async function completeRegistration(
  db: D1,
  telegramId: number,
  data: { name: string; house: House; race: Race; photoFileId: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE players
       SET name = ?, house = ?, race = ?, photo_file_id = ?, is_registered = 1, updated_at = ?
       WHERE telegram_id = ?`
    )
    .bind(data.name, data.house, data.race, data.photoFileId, now(), telegramId)
    .run();
}

// شرط بلاک شدن (برای میدلوورهای بعدی هم لازم میشه)
export async function isPlayerBlocked(db: D1, telegramId: number): Promise<boolean> {
  const p = await getPlayer(db, telegramId);
  return !!p?.isBlocked;
}

// فروشنده‌ای که آیتم فعال روی مارکت‌پلیس داره، اجازه‌ی ویرایش پروفایل نداره
export async function hasActiveListing(db: D1, telegramId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT has_active_listing FROM players WHERE telegram_id = ?")
    .bind(telegramId)
    .first();
  return !!row?.has_active_listing;
}

// برای /star و /antistar - تعداد ستاره منفی نمیشه
export async function adjustLeagueStars(db: D1, telegramId: number, delta: number): Promise<void> {
  await db
    .prepare(
      "UPDATE players SET league_stars = MAX(0, league_stars + ?), updated_at = ? WHERE telegram_id = ?"
    )
    .bind(delta, Date.now(), telegramId)
    .run();
}

// /block (کارمند) و بلاک خودکار بابت اسپم - reason مثلا "manual" یا "spam"
export async function blockPlayer(db: D1, telegramId: number, reason: string): Promise<void> {
  await db
    .prepare("UPDATE players SET is_blocked = 1, block_reason = ?, updated_at = ? WHERE telegram_id = ?")
    .bind(reason, Date.now(), telegramId)
    .run();
}

// فقط کارمند میتونه صدا بزنه (چک مجوز توی هندلر انجام میشه)
export async function unblockPlayer(db: D1, telegramId: number): Promise<void> {
  await db
    .prepare("UPDATE players SET is_blocked = 0, block_reason = NULL, updated_at = ? WHERE telegram_id = ?")
    .bind(Date.now(), telegramId)
    .run();
}
