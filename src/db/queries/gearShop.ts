import { ARMOR_ITEMS, WEAPON_ITEMS, type GearItem } from "../../config/constants";

type D1 = any;
type GearType = "armor" | "weapon";

function catalogFor(type: GearType): GearItem[] {
  return type === "armor" ? ARMOR_ITEMS : WEAPON_ITEMS;
}

export type BuyGearResult = { ok: true } | { ok: false; error: string };

// با خرید جدید، آیتم قبلی از اینونتوری حذف میشه (بدون بازگشت پول) - طبق قانون گفته‌شده
async function buyGear(db: D1, playerId: number, type: GearType, itemKey: string): Promise<BuyGearResult> {
  const item = catalogFor(type).find((i) => i.key === itemKey);
  if (!item) return { ok: false, error: "این آیتم پیدا نشد." };

  const player = await db.prepare("SELECT level, coins_fc FROM players WHERE telegram_id = ?").bind(playerId).first();
  if (!player) return { ok: false, error: "بازیکن پیدا نشد." };
  if (player.level < item.unlockLevel) return { ok: false, error: `این آیتم از لول ${item.unlockLevel} باز میشود.` };
  if (player.coins_fc < item.priceFc) return { ok: false, error: "سکه‌ی کافی ندارید." };

  await db
    .prepare("UPDATE players SET coins_fc = coins_fc - ?, updated_at = ? WHERE telegram_id = ?")
    .bind(item.priceFc, Date.now(), playerId)
    .run();

  // زره/سلاح قبلی حذف میشه (هر شخص فقط یکی میتونه داشته باشه)
  await db
    .prepare("DELETE FROM inventory_items WHERE player_id = ? AND item_type = ?")
    .bind(playerId, type)
    .run();

  await db
    .prepare(
      "INSERT INTO inventory_items (player_id, item_type, item_key, quantity, equipped) VALUES (?, ?, ?, 1, 1)"
    )
    .bind(playerId, type, itemKey)
    .run();

  return { ok: true };
}

export function buyArmor(db: D1, playerId: number, armorKey: string): Promise<BuyGearResult> {
  return buyGear(db, playerId, "armor", armorKey);
}

export function buyWeapon(db: D1, playerId: number, weaponKey: string): Promise<BuyGearResult> {
  return buyGear(db, playerId, "weapon", weaponKey);
}
