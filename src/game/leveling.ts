import { xpNeededForLevel, MAX_LEVEL, LEVEL_MILESTONES } from "../config/constants";

type D1 = any;

export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  newHpMax: number;
  unlocks: string[]; // مثلا ["dungeon"] وقتی به لول ۵ رسید
}

export async function applyXpAndLevelUp(db: D1, playerId: number, xpGained: number): Promise<LevelUpResult> {
  const player = await db
    .prepare("SELECT xp, level, hp_max FROM players WHERE telegram_id = ?")
    .bind(playerId)
    .first();

  let xp = (player?.xp ?? 0) + xpGained;
  let level = player?.level ?? 1;
  let hpMax = player?.hp_max ?? 200;
  const unlocks: string[] = [];
  const startingLevel = level;

  while (level < MAX_LEVEL) {
    const needed = xpNeededForLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;

    const milestone = LEVEL_MILESTONES.find((m) => m.level === level);
    if (milestone?.hpBonus) hpMax += milestone.hpBonus;
    if (milestone?.unlocks) unlocks.push(milestone.unlocks);
  }

  await db
    .prepare("UPDATE players SET xp = ?, level = ?, hp_max = ?, updated_at = ? WHERE telegram_id = ?")
    .bind(xp, level, hpMax, Date.now(), playerId)
    .run();

  return { leveledUp: level > startingLevel, newLevel: level, newHpMax: hpMax, unlocks };
}
