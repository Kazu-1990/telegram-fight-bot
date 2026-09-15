// =========================================================
// کاتالوگ گرافیک - تنها فایلی که بعداً برای جایگزین کردن عکس‌های واقعی لازمه دست بزنی
// =========================================================
//
// فرمت هر انیمیشن: یک آرایه از مسیر عکس (فریم‌ها). اگه فایلی که آدرس دادی پیدا نشه
// (چون هنوز نذاشتیش)، خودکار یه باکس رنگی جایگزین با اسم روش نشون داده میشه - یعنی
// همین الان هم صحنه کامل کار میکنه، فقط با placeholder به‌جای عکس واقعی.
//
// وقتی عکس واقعی پیدا کردی:
//   ۱) فایل رو دقیقاً با همین مسیر (یا مسیر دلخواه خودت) توی پوشه‌ی public بذار
//   ۲) اگه تعداد فریم‌هات فرق داشت، فقط آرایه رو اینجا آپدیت کن
//   ۳) هیچ فایل دیگه‌ای (battleScene.js یا index.html ها) نیاز به تغییر نداره
//
// اندازه‌ی پیشنهادی هر فریم: ۲۵۶×۲۵۶ یا ۱۲۸×۱۲۸ پیکسل، PNG با پس‌زمینه‌ی شفاف (آلفا)
// تا روی صحنه درست بشینه، نه یه عکس مربعی با پس‌زمینه‌ی خودش.

const RACE_ASSETS = {
  werewolf: {
    label: "گرگینه",
    color: "#6b4a2f",
    frames: {
      idle: ["/assets/characters/werewolf/idle_1.png", "/assets/characters/werewolf/idle_2.png"],
      attack: ["/assets/characters/werewolf/attack_1.png", "/assets/characters/werewolf/attack_2.png"],
      defend: ["/assets/characters/werewolf/defend_1.png"],
      hit: ["/assets/characters/werewolf/hit_1.png"],
      ultimate: ["/assets/characters/werewolf/ultimate_1.png", "/assets/characters/werewolf/ultimate_2.png"],
    },
  },
  vampire: {
    label: "وامپایر",
    color: "#5b1a2b",
    frames: {
      idle: ["/assets/characters/vampire/idle_1.png", "/assets/characters/vampire/idle_2.png"],
      attack: ["/assets/characters/vampire/attack_1.png", "/assets/characters/vampire/attack_2.png"],
      defend: ["/assets/characters/vampire/defend_1.png"],
      hit: ["/assets/characters/vampire/hit_1.png"],
      ultimate: ["/assets/characters/vampire/ultimate_1.png", "/assets/characters/vampire/ultimate_2.png"],
    },
  },
  elf: {
    label: "الف",
    color: "#2f6b4a",
    frames: {
      idle: ["/assets/characters/elf/idle_1.png", "/assets/characters/elf/idle_2.png"],
      attack: ["/assets/characters/elf/attack_1.png", "/assets/characters/elf/attack_2.png"],
      defend: ["/assets/characters/elf/defend_1.png"],
      hit: ["/assets/characters/elf/hit_1.png"],
      ultimate: ["/assets/characters/elf/ultimate_1.png", "/assets/characters/elf/ultimate_2.png"],
    },
  },
  witcher: {
    label: "ویچر",
    color: "#4a4a4a",
    frames: {
      idle: ["/assets/characters/witcher/idle_1.png", "/assets/characters/witcher/idle_2.png"],
      attack: ["/assets/characters/witcher/attack_1.png", "/assets/characters/witcher/attack_2.png"],
      defend: ["/assets/characters/witcher/defend_1.png"],
      hit: ["/assets/characters/witcher/hit_1.png"],
      ultimate: ["/assets/characters/witcher/ultimate_1.png", "/assets/characters/witcher/ultimate_2.png"],
    },
  },
};

// دشمنان CPU فقط فریم idle دارن - حمله‌شون به‌جای انیمیشن اختصاصی، یه جلوه‌ی ساده (تکون/فلش) میگیره
const FOREST_ENEMY_ASSETS = {
  snake: { label: "مار", color: "#3d6b2f", frames: { idle: ["/assets/enemies/snake/idle_1.png"] } },
  boar: { label: "گراز", color: "#5c4326", frames: { idle: ["/assets/enemies/boar/idle_1.png"] } },
  wolf: { label: "گرگ", color: "#4a4a52", frames: { idle: ["/assets/enemies/wolf/idle_1.png"] } },
  bear: { label: "خرس", color: "#5c3d26", frames: { idle: ["/assets/enemies/bear/idle_1.png"] } },
};

const DUNGEON_ENEMY_ASSETS = {
  skeleton: { label: "اسکلت", color: "#c9c9b8", frames: { idle: ["/assets/enemies/skeleton/idle_1.png"] } },
  goblin: { label: "گابلین", color: "#4f6b2f", frames: { idle: ["/assets/enemies/goblin/idle_1.png"] } },
  ghost: { label: "شبح", color: "#7a8fa6", frames: { idle: ["/assets/enemies/ghost/idle_1.png"] } },
  demon: { label: "دیو", color: "#6b1f1f", frames: { idle: ["/assets/enemies/demon/idle_1.png"] } },
};

const GEAR_ICONS = {
  // کلیدها باید دقیقاً با item_key آرمور/سلاح توی constants.ts یکی باشن
  leather_armor: "/assets/gear/armor/leather_armor.png",
  chainmail: "/assets/gear/armor/chainmail.png",
  plate_armor: "/assets/gear/armor/plate_armor.png",
  dragonbone_armor: "/assets/gear/armor/dragonbone_armor.png",
  mythic_aegis: "/assets/gear/armor/mythic_aegis.png",
  rusty_dagger: "/assets/gear/weapon/rusty_dagger.png",
  steel_sword: "/assets/gear/weapon/steel_sword.png",
  war_axe: "/assets/gear/weapon/war_axe.png",
  enchanted_blade: "/assets/gear/weapon/enchanted_blade.png",
  godslayer: "/assets/gear/weapon/godslayer.png",
};

const BACKGROUNDS = {
  duel: "/assets/backgrounds/duel_arena.png",
  forest: "/assets/backgrounds/forest.png",
  dungeon: "/assets/backgrounds/dungeon.png",
};

// صداها - اختیاری؛ اگه فایل نبود، پخش بی‌صدا رد میشه (خطا نمیده)
const SOUND_EFFECTS = {
  attack_hit: "/assets/sfx/attack_hit.mp3",
  defend_block: "/assets/sfx/defend_block.mp3",
  potion_use: "/assets/sfx/potion_use.mp3",
  ultimate: "/assets/sfx/ultimate.mp3",
  win: "/assets/sfx/win.mp3",
  lose: "/assets/sfx/lose.mp3",
};

window.GameAssets = {
  RACE_ASSETS,
  FOREST_ENEMY_ASSETS,
  DUNGEON_ENEMY_ASSETS,
  GEAR_ICONS,
  BACKGROUNDS,
  SOUND_EFFECTS,
};
