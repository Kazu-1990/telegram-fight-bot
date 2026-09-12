type D1 = any;

export interface InventoryListItem {
  itemKey: string;
  quantity: number;
}

export async function getInventoryByType(
  db: D1,
  playerId: number,
  itemType: "potion" | "resource"
): Promise<InventoryListItem[]> {
  const rows = await db
    .prepare("SELECT item_key, quantity FROM inventory_items WHERE player_id = ? AND item_type = ?")
    .bind(playerId, itemType)
    .all();
  return (rows.results ?? []).map((r: any) => ({ itemKey: r.item_key, quantity: r.quantity }));
}
  armorKey: string | null;
  weaponKey: string | null;
}

// TODO(فاز شاپ): توابع مدیریت پوشن، منابع کرفت، و equip/unequip اینجا اضافه میشن
export async function getEquippedGear(db: D1, playerId: number): Promise<EquippedGear> {
  const rows = await db
    .prepare(
      "SELECT item_type, item_key FROM inventory_items WHERE player_id = ? AND equipped = 1 AND item_type IN ('armor','weapon')"
    )
    .bind(playerId)
    .all();

  let armorKey: string | null = null;
  let weaponKey: string | null = null;
  for (const row of rows.results ?? []) {
    if (row.item_type === "armor") armorKey = row.item_key;
    if (row.item_type === "weapon") weaponKey = row.item_key;
  }
  return { armorKey, weaponKey };
}

export async function getPotionQuantity(db: D1, playerId: number, potionKey: string): Promise<number> {
  const row = await db
    .prepare("SELECT quantity FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ?")
    .bind(playerId, potionKey)
    .first();
  return row?.quantity ?? 0;
}

// یک واحد پوشن از موجودی واقعی کم میکنه؛ اگه موجودی صفر شد، ردیف حذف میشه
// خروجی false یعنی اصلا موجودی نداشت (فراخوان باید جلوی استفاده رو بگیره)
export async function consumePotionFromInventory(db: D1, playerId: number, potionKey: string): Promise<boolean> {
  const qty = await getPotionQuantity(db, playerId, potionKey);
  if (qty <= 0) return false;

  if (qty === 1) {
    await db
      .prepare("DELETE FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ?")
      .bind(playerId, potionKey)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE inventory_items SET quantity = quantity - 1 WHERE player_id = ? AND item_type = 'potion' AND item_key = ?"
      )
      .bind(playerId, potionKey)
      .run();
  }
  return true;
}

// نام مستعار - api.ts مینی‌اپ duel این اسم رو صدا میزنه
export const decrementPotionQuantity = consumePotionFromInventory;

// برای جوایز forest/dungeon - منابع خام (گیاه/آیتم کرفت) به اینونتوری اضافه میشن
export async function addResourceItem(db: D1, playerId: number, resourceKey: string, quantity = 1): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inventory_items (player_id, item_type, item_key, quantity, equipped)
       VALUES (?, 'resource', ?, ?, 0)
       ON CONFLICT(player_id, item_type, item_key) DO UPDATE SET quantity = quantity + ?`
    )
    .bind(playerId, resourceKey, quantity, quantity)
    .run();
}

export async function getPotionQuantity(db: D1, playerId: number, potionKey: string): Promise<number> {
  const row = await db
    .prepare("SELECT quantity FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ?")
    .bind(playerId, potionKey)
    .first();
  return row?.quantity ?? 0;
}

// یک واحد از پوشن مصرف‌شده رو از اینونتوری واقعی کم میکنه (اگه به صفر رسید، ردیف حذف میشه)
export async function decrementPotionQuantity(db: D1, playerId: number, potionKey: string): Promise<void> {
  await db
    .prepare(
      "UPDATE inventory_items SET quantity = quantity - 1 WHERE player_id = ? AND item_type = 'potion' AND item_key = ? AND quantity > 0"
    )
    .bind(playerId, potionKey)
    .run();
  await db
    .prepare("DELETE FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ? AND quantity <= 0")
    .bind(playerId, potionKey)
    .run();
}
