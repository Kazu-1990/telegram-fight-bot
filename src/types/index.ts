import type { House, Race, PotionKey, ResourceKey, DeathDuelChoice } from "../config/constants";

// چند فایل دیگه (players.ts، engine.ts، duel/api.ts) این تایپ‌ها رو از همینجا میگیرن
export type { House, Race, PotionKey, ResourceKey, DeathDuelChoice };

// =========================================================
// موجودیت‌های اصلی دیتابیس
// =========================================================

export interface Player {
  telegramId: number;
  isRegistered: boolean;
  name: string | null;
  house: House | null;
  race: Race | null;
  photoFileId: string | null; // فایل آیدی عکس پروفایل (تلگرام)
  title: string | null; // لقب - مکانیزم ست کردنش فعلاً تعریف نشده

  level: number;
  xp: number;
  coinsFc: number;

  hpMax: number; // بر اساس دستاوردهای لول محاسبه/ذخیره میشه

  totalWins: number; // برد duel - هیچوقت با resetboard صفر نمیشه
  seasonWins: number; // برد duel - با resetboard صفر میشه (برای جدول امتیازات)
  leagueStars: number; // تعداد بار برنده شدن لیگ (/star و /antistar)

  forestWinsTotal: number; // برای تریگر آیتم جایزه هر ۵ برد
  dungeonWinsTotal: number;

  isBlocked: boolean;
  blockReason: string | null;

  forestCooldownUntil: number | null; // timestamp ms
  dungeonCooldownUntil: number | null;

  createdAt: number;
  updatedAt: number;
}

export type InventoryItemType = "potion" | "armor" | "weapon" | "resource";

export interface InventoryItem {
  id: number;
  playerId: number;
  itemType: InventoryItemType;
  itemKey: string; // مثلا "healer" یا "dew" یا یه armorKey خاص
  quantity: number;
  equipped: boolean; // فقط برای armor/weapon معنا داره (حداکثر یکی equipped)
  imageUrl: string | null; // برای آینده - گرافیک
}

export interface Group {
  chatId: number;
  isActive: boolean;
  activatedByUserId: number | null;
  activatedAt: number | null;
}

export type MatchType = "duel" | "forest" | "dungeon";
export type MatchStatus = "waiting" | "active" | "finished" | "cancelled" | "expired";

export interface Match {
  id: number;
  type: MatchType;
  chatId: number | null; // فقط duel این رو داره (پیام توی گروه)
  groupMessageId: number | null; // برای ادیت بعدی پیام دعوت
  player1Id: number | null;
  player2Id: number | null; // برای forest/dungeon معمولا null چون CPU جدا هندل میشه
  enemyKey: string | null; // برای forest/dungeon
  status: MatchStatus;
  state: CombatState | null; // اسنپ‌شات کامل وضعیت نبرد، به صورت JSON ذخیره میشه
  winnerId: number | null;
  createdAt: number;
  finishedAt: number | null;
}

export type MarketplaceStatus = "active" | "cancelled" | "sold";

export interface MarketplaceListing {
  id: number;
  sellerId: number;
  house: House; // برای فیلتر کردن بر اساس خاندان خریدار
  itemKey: PotionKey;
  priceFc: number;
  status: MarketplaceStatus;
  createdAt: number;
}

// =========================================================
// وضعیت نبرد (Combat State) - داخل Match.state ذخیره میشه
// =========================================================

export type BodyPart = "head" | "body" | "leg";
export type PlayerAction = "attack" | "defense" | "ultimate" | "potion";

export interface FighterState {
  id: number | "cpu";
  race: Race; // برای تعیین نوع و اثر آلتیمیت لازم است
  level: number; // برای نمایش در HUD صحنه‌ی مبارزه
  name?: string; // برای نمایش در HUD - دشمنان CPU این رو ندارن
  house?: string; // برای نمایش در HUD - دشمنان CPU این رو ندارن
  hp: number;
  mana: number;
  hpMax: number;

  armorKey: string | null;
  weaponKey: string | null;

  potionUsesLeft: number; // شروع از MAX_POTION_USES_PER_MATCH، فقط برای پلیرها (نه CPU)
  ultimateUsesLeft: number; // شروع از MAX_ULTIMATE_USES_PER_MATCH
  hasUsedUltimateOnce: boolean; // بعد این true شد، هر راند مانا میگیره

  // اثرات تاخیری (مثل زهر الف یا آتش ویچر) که راندهای بعد باید اعمال شن
  pendingDelayedDamage: { amountPerRound: number; roundsRemaining: number }[];

  // برای بادیگارد: خنثی کردن ضربه بعدی به بدن
  negateNextBodyHit: boolean;

  // انتخاب این راند، تا وقتی حریف هم انتخاب نکرده منتظر می‌مونیم
  pendingAction: {
    action: PlayerAction;
    target?: BodyPart; // برای attack/defense
    potionKey?: PotionKey; // برای potion
  } | null;
}

export interface CombatState {
  round: number;
  fighters: [FighterState, FighterState]; // index 0 و 1
  isDeathDuel: boolean; // وقتی هردو هم‌زمان صفر شدن
  deathDuelChoices: [DeathDuelChoice | null, DeathDuelChoice | null];
  log: string[]; // تاریخچه راندها برای نمایش نتیجه نهایی
}
