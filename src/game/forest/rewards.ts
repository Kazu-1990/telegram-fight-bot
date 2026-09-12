import {
  FOREST_REWARD_TIERS,
  FOREST_BONUS_ITEMS_EVERY_N_WINS,
  FOREST_BONUS_ITEMS,
  FOREST_LOSS_COOLDOWN_MS,
} from "../../config/constants";
import { applyXpAndLevelUp } from "../leveling";
import { addResourceItem } from "../../db/queries/inventory";

type D1 = any;

export interface ForestWinResult {
  fcGained: number;
  xpGained: number;
  bonusItem: string | null;
  levelUp: Awaited<ReturnType<typeof applyXpAndLevelUp>>;
}

function pickRewardTier(): { fc: number; xp: number } {
  const roll = Math.random();
  let acc = 0;
  for (const tier of FOREST_REWARD_TIERS) {
    acc += tier.chance;
    if (roll <= acc) return { fc: tier.fc, xp: tier.xp };
  }
  return FOREST_REWARD_TIERS[FOREST_REWARD_TIERS.length - 1];
}

export async function applyForestWin(db: D1, playerId: number): Promise<ForestWinResult> {
  const { fc, xp } = pickRewardTier();

  const levelUp = await applyXpAndLevelUp(db, playerId, xp);

  const row = await db
    .prepare("SELECT coins_fc, forest_wins_total FROM players WHERE telegram_id = ?")
    .bind(playerId)
    .first();
  const newWinsTotal = (row?.forest_wins_total ?? 0) + 1;

  await db
    .prepare("UPDATE players SET coins_fc = coins_fc + ?, forest_wins_total = ?, updated_at = ? WHERE telegram_id = ?")
    .bind(fc, newWinsTotal, Date.now(), playerId)
    .run();

  let bonusItem: string | null = null;
  if (newWinsTotal % FOREST_BONUS_ITEMS_EVERY_N_WINS === 0) {
    bonusItem = FOREST_BONUS_ITEMS[Math.floor(Math.random() * FOREST_BONUS_ITEMS.length)];
    await addResourceItem(db, playerId, bonusItem, 1);
  }

  return { fcGained: fc, xpGained: xp, bonusItem, levelUp };
}

// باخت در forest: ۳۰ دقیقه نمیتونه دوباره این دستور رو بازی کنه
export async function applyForestLoss(db: D1, playerId: number): Promise<void> {
  const until = Date.now() + FOREST_LOSS_COOLDOWN_MS;
  await db.prepare("UPDATE players SET forest_cooldown_until = ? WHERE telegram_id = ?").bind(until, playerId).run();
}
