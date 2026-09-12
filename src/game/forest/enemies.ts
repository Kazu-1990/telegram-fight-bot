import type { BodyPart } from "../../types";
import { FOREST_ENEMY_SPAWN_RATES } from "../../config/constants";

export type ForestEnemyKey = "snake" | "boar" | "wolf" | "bear";

export interface EnemyDefinition {
  key: string;
  hpMax: number;
  // احتمال اینکه دشمن به هر ناحیه حمله کنه (جمعشون باید ۱ باشه)
  attackDistribution: Record<BodyPart, number>;
  // شانس دفاع دشمن وقتی پلیر به یک ناحیه‌ی خاص حمله میکنه - اگه نبود یعنی اصلا دفاع نمیکنه
  defenseByRegion?: Partial<Record<BodyPart, number>>;
  // بعضی دشمنا (مثل خرس) یک شانس دفاع یکسان دارن، فارغ از ناحیه‌ی حمله
  flatDefenseChance?: number;
  imageUrl?: string | null;
}

// طبق توضیحات:
// مار و گراز اصلا دفاع نمیکنن
// گرگ فقط وقتی پلیر به پاش حمله کنه ۵۰٪ احتمال دفاع داره
// خرس چون عددش کلی («در کل احتمال...») بیان شده، به عنوان شانس یکسان روی هر ناحیه در نظر گرفته شد
export const FOREST_ENEMIES: Record<ForestEnemyKey, EnemyDefinition> = {
  snake: {
    key: "snake",
    hpMax: 60,
    attackDistribution: { leg: 0.7, body: 0.3, head: 0 },
  },
  boar: {
    key: "boar",
    hpMax: 90,
    attackDistribution: { body: 0.7, leg: 0.2, head: 0.1 },
  },
  wolf: {
    key: "wolf",
    hpMax: 120,
    attackDistribution: { head: 0.5, body: 0.25, leg: 0.25 },
    defenseByRegion: { leg: 0.5 },
  },
  bear: {
    key: "bear",
    hpMax: 150,
    attackDistribution: { head: 0.3, body: 0.4, leg: 0.3 },
    flatDefenseChance: 0.15,
  },
};

export function pickRandomForestEnemy(): EnemyDefinition {
  return pickWeighted(FOREST_ENEMIES, FOREST_ENEMY_SPAWN_RATES);
}

// تابع کمکی مشترک - در dungeon/enemies.ts هم استفاده میشه
export function pickWeighted<T extends string>(
  definitions: Record<T, EnemyDefinition>,
  rates: Record<T, number>
): EnemyDefinition {
  const roll = Math.random();
  let acc = 0;
  for (const key of Object.keys(rates) as T[]) {
    acc += rates[key];
    if (roll <= acc) return definitions[key];
  }
  // fallback برای خطای گرد کردن اعشار
  const lastKey = Object.keys(rates)[Object.keys(rates).length - 1] as T;
  return definitions[lastKey];
}
