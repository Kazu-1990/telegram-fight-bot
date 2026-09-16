// =========================================================
// تنظیمات کلی و ثابت‌های بازی
// هر مقداری که ممکنه بخوای بعداً تغییر بدی، همینجاست
// =========================================================

// ---------- دسترسی و امنیت ----------

// کد فعال‌سازی گروه‌ها - خودت اینو عوض کن
export const GROUP_ACTIVATION_CODE = "CHANGE_ME_1234";

// آیدی عددی کارمندها (فقط اونا به دستورات مدیریتی دسترسی دارن)
// duel, cancel duel, star, antistar, resetboard, block, unblock
export const STAFF_IDS: number[] = [
  // مثال: 123456789,
];

export function isStaff(userId: number): boolean {
  return STAFF_IDS.includes(userId);
}

// نام کاربری بات (بدون @) - برای ساخت دیپ‌لینک فعال‌سازی گروه لازمه
export const BOT_USERNAME = "CHANGE_ME_bot";

// ---------- ضد اسپم ----------
// فرض منطقی: اگه یه کاربر توی بازه‌ی زمانی کوتاه، تعداد دستور مشخصی بفرسته، اسپمر شناخته میشه
export const ANTISPAM_WINDOW_MS = 10_000; // ۱۰ ثانیه
export const ANTISPAM_MAX_COMMANDS = 5; // بیشتر از ۵ دستور توی ۱۰ ثانیه = اسپم
export const ANTISPAM_BLOCK_REASON = "spam";

// ---------- ثبت‌نام ----------
export const HOUSES = ["stalker", "evans", "scott"] as const;
export type House = (typeof HOUSES)[number];

export const RACES = ["werewolf", "vampire", "elf", "witcher"] as const;
export type Race = (typeof RACES)[number];

// ---------- نبرد (Combat) ----------
export const HP_MAX_BASE = 200;
export const MANA_MAX = 8;
export const MANA_REGEN_PER_ROUND = 2;

// دمیج حمله بر اساس ناحیه هدف
export const ATTACK_DAMAGE = {
  head: 30,
  body: 20,
  leg: 15,
} as const;

// دمیجی که با دفاع موفق به حریف برمی‌گرده
export const DEFENSE_REFLECT_DAMAGE = 20;

// محدودیت پوشن در نبرد PvP/PvE-duel-like (نه forest/dungeon)
export const MAX_POTION_USES_PER_MATCH = 2;
export const MAX_POTION_TYPES_IN_INVENTORY = 3;
export const MAX_POTION_STACK_PER_TYPE = 5;

// فرض منطقی: اگه هیچکس توی duel وارد نشه، بعد از این مدت منقضی میشه
export const DUEL_WAITING_EXPIRY_MS = 5 * 60_000; // ۵ دقیقه

// ---------- آلتیمیت‌ها ----------
// دقت: بعد از اولین استفاده (فعال یا خنثی شده) دیگه هر راند ۱ مانا میگیره
// بعد از دومین استفاده، دیگه مانا نمیگیره (سقف قدرت‌ها در یک بازی: ۲ بار)
export const MANA_PER_ROUND_AFTER_FIRST_ULTIMATE = 1;
export const MAX_ULTIMATE_USES_PER_MATCH = 2;

export const ULTIMATES: Record<
  Race,
  {
    neutralizedBy: "head" | "body" | "leg";
    // اثر فوری روی حریف/خودش، و اثرات تاخیری (راندهای بعد)
  }
> = {
  vampire: { neutralizedBy: "head" },
  elf: { neutralizedBy: "body" },
  werewolf: { neutralizedBy: "body" },
  witcher: { neutralizedBy: "leg" },
};

// ---------- سنگ‌کاغذقیچی مرگ (وقتی هردو هم‌زمان صفر شدن) ----------
// مشت (سنگ) > جادو (قیچی) > دفاع (کاغذ) > مشت (سنگ)
export const DEATH_DUEL_CHOICES = ["punch", "defense", "magic"] as const;
export type DeathDuelChoice = (typeof DEATH_DUEL_CHOICES)[number];
// punch (سنگ) میبره از magic (قیچی)
// magic (قیچی) میبره از defense (کاغذ)
// defense (کاغذ) میبره از punch (سنگ)

// ---------- لول و XP ----------
// فرمول: تا لولِ آستانه، xp لازم برای رفتن به لول بعد ثابته
export const XP_THRESHOLDS: { upToLevel: number; xpNeeded: number }[] = [
  { upToLevel: 5, xpNeeded: 200 },
  { upToLevel: 10, xpNeeded: 350 },
  { upToLevel: 15, xpNeeded: 500 },
  { upToLevel: 20, xpNeeded: 750 },
  { upToLevel: 100, xpNeeded: 1000 },
];
export const MAX_LEVEL = 100;

export function xpNeededForLevel(level: number): number {
  const tier = XP_THRESHOLDS.find((t) => level < t.upToLevel) ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return tier.xpNeeded;
}

// دستاوردهای لول (باز شدن بخش‌ها یا افزایش hp پایه)
export const LEVEL_MILESTONES: { level: number; hpBonus?: number; unlocks?: string }[] = [
  { level: 5, unlocks: "dungeon" },
  { level: 15, hpBonus: 10 }, // 200 -> 210
  { level: 25, hpBonus: 10 }, // 210 -> 220
  { level: 35, hpBonus: 10 }, // 220 -> 230
  { level: 50, hpBonus: 10 }, // 230 -> 240
  { level: 80, hpBonus: 10 }, // 240 -> 250
];

// حداقل لول برای کرفت پوشن
export const MIN_LEVEL_FOR_CRAFT = 3;
export const CRAFT_ATTEMPT_COST_FC = 2;

// ---------- پوشن‌ها ----------
export const POTIONS = {
  healer: { hpBonus: 10 },
  healer2x: { hpBonus: 20 },
  health: { hpBonus: 50 },
  wizz: { manaBonus: 2 },
  bodyguard: { effect: "negate_next_body_hit" },
} as const;
export type PotionKey = keyof typeof POTIONS;

// فرمول‌های کرفت (بدون اهمیت ترتیب - سه ماده)
export const CRAFT_RECIPES: Record<PotionKey, [string, string, string]> = {
  healer: ["dew", "ash", "mint"],
  healer2x: ["mint", "mushroom", "petal"],
  health: ["goblin_tear", "mushroom", "moonstone"],
  wizz: ["petal", "spider_web", "demon_saliva"],
  bodyguard: ["spider_web", "moonstone", "goblin_tear"],
};

// نام منابع خام (resource) که فقط برای کرفت استفاده میشن، قابل استفاده مستقیم در نبرد نیستن
export const RESOURCE_KEYS = [
  "dew", // شبنم
  "mushroom", // قارچ
  "mint", // نعنا
  "ash", // خاکستر
  "petal", // گلبرگ
  "moonstone", // سنگ ماه
  "goblin_tear", // اشک گابلین
  "demon_saliva", // بزاق دیو
  "spider_web", // تار عنکبوت
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

// ---------- شاپ - قیمت‌های مجاز فروش پوشن در marketplace ----------
export const MARKETPLACE_ALLOWED_PRICES_FC = [25, 50, 100, 150, 200] as const;

// ---------- فورست ----------
export const FOREST_LOSS_COOLDOWN_MS = 30 * 60_000; // ۳۰ دقیقه
export const FOREST_ENEMY_SPAWN_RATES = {
  snake: 0.30,
  boar: 0.30,
  wolf: 0.25,
  bear: 0.15,
};
export const FOREST_REWARD_TIERS = [
  { chance: 0.80, fc: 3, xp: 5 },
  { chance: 0.15, fc: 5, xp: 8 },
  { chance: 0.05, fc: 7, xp: 10 },
];
// هر ۵ برد پشت‌سرهم/تجمعی، یکی از این آیتم‌ها به احتمال برابر
export const FOREST_BONUS_ITEMS_EVERY_N_WINS = 5;
export const FOREST_BONUS_ITEMS: ResourceKey[] = [
  "dew",
  "mushroom",
  "mint",
  "ash",
  "petal",
  "moonstone",
];

// ---------- دانجن ----------
export const DUNGEON_LOSS_COOLDOWN_MS = 90 * 60_000; // ۹۰ دقیقه
export const DUNGEON_MIN_LEVEL = 5;
export const DUNGEON_ENEMY_SPAWN_RATES = {
  skeleton: 0.50,
  goblin: 0.30,
  ghost: 0.10,
  demon: 0.10,
};
export const DUNGEON_REWARD_TIERS = [
  { chance: 0.60, fc: 10, xp: 15 },
  { chance: 0.30, fc: 12, xp: 18 },
  { chance: 0.09, fc: 15, xp: 20 },
  { chance: 0.01, fc: 20, xp: 30 },
];
export const DUNGEON_BONUS_ITEMS_EVERY_N_WINS = 5;
export const DUNGEON_BONUS_ITEMS: ResourceKey[] = [
  "goblin_tear",
  "demon_saliva",
  "spider_web",
];

// ---------- گرافیک (برای آینده) ----------
// فعلاً همه‌جا false/null، بعداً که خواستی گرافیکی کنی فقط همین مقادیر رو پر کن
// هر آیتم/دشمن/نژاد یک image_url اختیاری دارن (در schema.sql هم لحاظ شده)
export const GRAPHICS_ENABLED = false;

// ---------- مینی‌اپ‌ها ----------
// وقتی روی Cloudflare Pages/Workers دیپلوی کردی، این آدرس رو با دامنه‌ی واقعی عوض کن
export const WEBAPP_BASE_URL = "https://telegram-fight-bot.fearworld7.workers.dev";
export const WEBAPP_PATHS = {
  duel: "/duel",
  forest: "/forest",
  dungeon: "/dungeon",
  shop: "/shop",
} as const;

// ---------- آرمور و سلاح ----------
// جزئیات (اسم/قیمت/لول لازم/اثر) توی توضیحاتت مشخص نشده بود، این ست منطقی خودمه.
// هر وقت خواستی، فقط همین دو آرایه رو عوض کن - بقیه‌ی کد (شاپ، combat engine) خودکار باهاش کار میکنه.
export interface GearItem {
  key: string;
  name: string;
  unlockLevel: number;
  priceFc: number;
  // آرمور: درصد کاهش دمیج (0 تا 1) - سلاح: دمیج اضافه‌ی ثابت روی هر حمله
  value: number;
  imageUrl: string | null;
}

export const ARMOR_ITEMS: GearItem[] = [
  { key: "leather_armor", name: "زره چرمی", unlockLevel: 1, priceFc: 20, value: 0.05, imageUrl: null },
  { key: "chainmail", name: "زره زنجیری", unlockLevel: 10, priceFc: 60, value: 0.1, imageUrl: null },
  { key: "plate_armor", name: "زره پلیت", unlockLevel: 25, priceFc: 150, value: 0.15, imageUrl: null },
  { key: "dragonbone_armor", name: "زره استخوان اژدها", unlockLevel: 50, priceFc: 350, value: 0.2, imageUrl: null },
  { key: "mythic_aegis", name: "سپر اسطوره‌ای", unlockLevel: 80, priceFc: 700, value: 0.25, imageUrl: null },
];

export const WEAPON_ITEMS: GearItem[] = [
  { key: "rusty_dagger", name: "خنجر زنگ‌زده", unlockLevel: 1, priceFc: 20, value: 3, imageUrl: null },
  { key: "steel_sword", name: "شمشیر فولادی", unlockLevel: 10, priceFc: 60, value: 7, imageUrl: null },
  { key: "war_axe", name: "تبر جنگی", unlockLevel: 25, priceFc: 150, value: 12, imageUrl: null },
  { key: "enchanted_blade", name: "تیغه‌ی افسون‌شده", unlockLevel: 50, priceFc: 350, value: 18, imageUrl: null },
  { key: "godslayer", name: "خداکش", unlockLevel: 80, priceFc: 700, value: 25, imageUrl: null },
];
