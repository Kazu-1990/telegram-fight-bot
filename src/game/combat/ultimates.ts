import type { Race } from "../../config/constants";

export interface UltimateEffect {
  damageToDefender: number;
  healAttacker: number;
  // اثر تاخیری روی حریف که راند(های) بعد اعمال میشه (زهر الف / آتش ویچر)
  delayedDamageToDefender?: { amountPerRound: number; roundsRemaining: number };
  // متن کامل وقتی آلتیمیت اثر میکنه (نه خنثی میشه)
  describeHit: (damage: number, heal: number) => string;
  // متن وقتی حریف درست دفاع کرده و آلتیمیت خنثی میشه
  describeNeutralized: () => string;
}

// طبق توضیحات:
// وامپایر: گاز گردن -> 25 دمیج به حریف + 20 هیل به خودش (خنثی با دفاع از سر)
// الف: تیر زهرآگین -> 30 دمیج فوری + 15 دمیج راند بعد (خنثی با دفاع از بدن)
// گرگینه: چنگال -> 45 دمیج یکجا (خنثی با دفاع از بدن)
// ویچر: پوشن آتش‌زا -> 20 دمیج فوری + 10 دمیج راند بعد + 10 دمیج راند بعدتر (خنثی با دفاع از پا)
export function getUltimateEffect(race: Race): UltimateEffect {
  switch (race) {
    case "vampire":
      return {
        damageToDefender: 25,
        healAttacker: 20,
        describeHit: (dmg, heal) =>
          `جلو رفت و گردن حریف را گاز گرفت! ${dmg} دمیج به حریف وارد کرد و ${heal} HP از آن به خودش برگرداند.`,
        describeNeutralized: () => "حریف با دفاع از سر، گاز گرفتن وامپایر را خنثی کرد.",
      };
    case "elf":
      return {
        damageToDefender: 30,
        healAttacker: 0,
        delayedDamageToDefender: { amountPerRound: 15, roundsRemaining: 1 },
        describeHit: (dmg) =>
          `تیری حاوی زهر به سمت حریف شلیک کرد! ${dmg} دمیج فوری وارد کرد و زهر آن، راند بعد هم آسیب اضافه می‌زند.`,
        describeNeutralized: () => "حریف با دفاع از بدن، تیر زهرآگین الف را دفع کرد.",
      };
    case "werewolf":
      return {
        damageToDefender: 45,
        healAttacker: 0,
        describeHit: (dmg) => `چنگال‌های تیزش را به بدن حریف فرو کرد! یکباره ${dmg} دمیج وارد کرد.`,
        describeNeutralized: () => "حریف با دفاع از بدن، چنگال‌های گرگینه را دفع کرد.",
      };
    case "witcher":
      return {
        damageToDefender: 20,
        healAttacker: 0,
        delayedDamageToDefender: { amountPerRound: 10, roundsRemaining: 2 },
        describeHit: (dmg) =>
          `پوشنی آتش‌زا زیر پای حریف انداخت! ${dmg} دمیج فوری زد و آتش آن، دو راند بعد هم آسیب اضافه می‌زند.`,
        describeNeutralized: () => "حریف با دفاع از پا، آتش ویچر را خاموش کرد.",
      };
  }
}
