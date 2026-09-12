import { MIN_LEVEL_FOR_CRAFT, CRAFT_ATTEMPT_COST_FC } from "../../config/constants";
import { matchRecipe } from "../../game/shop/craft";
import { inventoryHasRoomForOne, addPotionToInventory } from "./marketplace";

type D1 = any;

export type CraftResult =
  | { ok: true; success: true; potionKey: string }
  | { ok: true; success: false; reason: "no_match" | "inventory_full" }
  | { ok: false; error: string };

async function getResourceQty(db: D1, playerId: number, resourceKey: string): Promise<number> {
  const row = await db
    .prepare("SELECT quantity FROM inventory_items WHERE player_id = ? AND item_type = 'resource' AND item_key = ?")
    .bind(playerId, resourceKey)
    .first();
  return row?.quantity ?? 0;
}

async function consumeResource(db: D1, playerId: number, resourceKey: string, amount: number): Promise<void> {
  const qty = await getResourceQty(db, playerId, resourceKey);
  if (qty <= amount) {
    await db
      .prepare("DELETE FROM inventory_items WHERE player_id = ? AND item_type = 'resource' AND item_key = ?")
      .bind(playerId, resourceKey)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE inventory_items SET quantity = quantity - ? WHERE player_id = ? AND item_type = 'resource' AND item_key = ?"
      )
      .bind(amount, playerId, resourceKey)
      .run();
  }
}

export async function attemptCraft(
  db: D1,
  playerId: number,
  resources: [string, string, string]
): Promise<CraftResult> {
  const player = await db.prepare("SELECT level, coins_fc FROM players WHERE telegram_id = ?").bind(playerId).first();
  if (!player) return { ok: false, error: "بازیکن پیدا نشد." };
  if (player.level < MIN_LEVEL_FOR_CRAFT) {
    return { ok: false, error: `برای کرفت باید حداقل لول ${MIN_LEVEL_FOR_CRAFT} باشید.` };
  }
  if (player.coins_fc < CRAFT_ATTEMPT_COST_FC) {
    return { ok: false, error: `برای هر تلاش کرفت به ${CRAFT_ATTEMPT_COST_FC} FC نیاز دارید.` };
  }

  // بررسی موجودی هر منبع (با احتساب تکراری بودن احتمالی)
  const neededCounts = new Map<string, number>();
  for (const r of resources) neededCounts.set(r, (neededCounts.get(r) ?? 0) + 1);

  for (const [resourceKey, neededAmount] of neededCounts) {
    const have = await getResourceQty(db, playerId, resourceKey);
    if (have < neededAmount) {
      return { ok: false, error: `شما به اندازه‌ی کافی «${resourceKey}» ندارید.` };
    }
  }

  // هزینه‌ی تلاش همیشه کسر میشه - صرف نظر از موفقیت
  await db
    .prepare("UPDATE players SET coins_fc = coins_fc - ?, updated_at = ? WHERE telegram_id = ?")
    .bind(CRAFT_ATTEMPT_COST_FC, Date.now(), playerId)
    .run();

  for (const [resourceKey, amount] of neededCounts) {
    await consumeResource(db, playerId, resourceKey, amount);
  }

  const potionKey = matchRecipe(resources);
  if (!potionKey) {
    return { ok: true, success: false, reason: "no_match" };
  }

  const hasRoom = await inventoryHasRoomForOne(db, playerId, potionKey);
  if (!hasRoom) {
    // منابع و هزینه مصرف شدن ولی جا برای پوشن نبود - طبق قانون کلی «تلاش هزینه داره صرف نظر از نتیجه»
    return { ok: true, success: false, reason: "inventory_full" };
  }

  await addPotionToInventory(db, playerId, potionKey);
  return { ok: true, success: true, potionKey };
}
