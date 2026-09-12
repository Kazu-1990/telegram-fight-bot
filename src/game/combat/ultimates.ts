import type { Race } from "../../config/constants";

export interface UltimateEffect {
  damageToDefender: number;
  healAttacker: number;
  // اثر تاخیری روی حریف که راند(های) بعد اعمال میشه (زهر الف / آتش ویچر)
  delayedDamageToDefender?: { amountPerRound: number; roundsRemaining: number };
}

// طبق توضیحات:
// وامپایر: گاز گردن -> 25 دمیج به حریف + 20 هیل به خودش (خنثی با دفاع از سر)
// الف: تیر زهرآگین -> 30 دمیج فوری + 15 دمیج راند بعد (خنثی با دفاع از بدن)
// گرگینه: چنگال -> 45 دمیج یکجا (خنثی با دفاع از بدن)
// ویچر: پوشن آتش‌زا -> 20 دمیج فوری + 10 دمیج راند بعد + 10 دمیج راند بعدتر (خنثی با دفاع از پا)
export function getUltimateEffect(race: Race): UltimateEffect {
  switch (race) {
    case "vampire":
      return { damageToDefender: 25, healAttacker: 20 };
    case "elf":
      return {
        damageToDefender: 30,
        healAttacker: 0,
        delayedDamageToDefender: { amountPerRound: 15, roundsRemaining: 1 },
      };
    case "werewolf":
      return { damageToDefender: 45, healAttacker: 0 };
    case "witcher":
      return {
        damageToDefender: 20,
        healAttacker: 0,
        delayedDamageToDefender: { amountPerRound: 10, roundsRemaining: 2 },
      };
  }
}
