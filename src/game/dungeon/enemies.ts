import type { BodyPart } from "../../types";
import { DUNGEON_ENEMY_SPAWN_RATES } from "../../config/constants";
import { pickWeighted, type EnemyDefinition } from "../forest/enemies";

export type DungeonEnemyKey = "skeleton" | "goblin" | "ghost" | "demon";

export interface DungeonEnemyDefinition extends EnemyDefinition {
  // شبح تا وقتی یکی از حملاتش درست دفاع نشه، اصلا قابل ضربه زدن نیست
  untouchableUntilFirstPlayerDefense?: boolean;
}

// نکته درباره‌ی شبح: توضیحات کمی متناقض بود (هم الگوی «اول سر بعد بدن» گفته شده بود
// هم درصد ۷۰٪ سر/۳۰٪ پا). چون درصدها دقیق‌تر بودن، همونا رو مبنا گرفتم.
// مکانیزم اصلی: شبح قابل ضربه‌زدن نیست مگر اینکه پلیر یکی از حملات شبح رو درست دفاع کنه؛
// از اون لحظه به بعد شبح برای بقیه‌ی همون مبارزه قابل ضربه‌زدنه.
export const DUNGEON_ENEMIES: Record<DungeonEnemyKey, DungeonEnemyDefinition> = {
  skeleton: {
    key: "skeleton",
    hpMax: 150,
    attackDistribution: { body: 0.5, head: 0.35, leg: 0.15 },
    defenseByRegion: { body: 0.6, leg: 0.1, head: 0.2 },
  },
  goblin: {
    key: "goblin",
    hpMax: 170,
    attackDistribution: { body: 0.6, leg: 0.3, head: 0.1 },
    defenseByRegion: { head: 0.8, leg: 0.5, body: 0.05 },
  },
  ghost: {
    key: "ghost",
    hpMax: 170,
    attackDistribution: { head: 0.7, leg: 0.3, body: 0 },
    defenseByRegion: { head: 0.3, leg: 1, body: 0.3 },
    untouchableUntilFirstPlayerDefense: true,
  },
  demon: {
    key: "demon",
    hpMax: 200,
    attackDistribution: { head: 0.7, body: 0.15, leg: 0.15 },
    defenseByRegion: { head: 0.8, body: 0.7, leg: 1 },
  },
};

export function pickRandomDungeonEnemy(): DungeonEnemyDefinition {
  return pickWeighted(DUNGEON_ENEMIES, DUNGEON_ENEMY_SPAWN_RATES) as DungeonEnemyDefinition;
}

export type { EnemyDefinition } from "../forest/enemies";
export type CombinedBodyPart = BodyPart;
