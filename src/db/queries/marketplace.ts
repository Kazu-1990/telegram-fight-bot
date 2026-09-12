import { MARKETPLACE_ALLOWED_PRICES_FC, MAX_POTION_TYPES_IN_INVENTORY, MAX_POTION_STACK_PER_TYPE } from "../../config/constants";

type D1 = any;

export interface MarketplaceListingRow {
  id: number;
  sellerId: number;
  house: string;
  itemKey: string;
  priceFc: number;
  status: string;
  createdAt: number;
}

function rowToListing(r: any): MarketplaceListingRow {
  return {
    id: r.id,
    sellerId: r.seller_id,
    house: r.house,
    itemKey: r.item_key,
    priceFc: r.price_fc,
    status: r.status,
    createdAt: r.created_at,
  };
}

async function recalcHasActiveListing(db: D1, sellerId: number): Promise<void> {
  const row = await db
    .prepare("SELECT COUNT(*) as cnt FROM marketplace_listings WHERE seller_id = ? AND status = 'active'")
    .bind(sellerId)
    .first();
  const hasAny = (row?.cnt ?? 0) > 0 ? 1 : 0;
  await db.prepare("UPDATE players SET has_active_listing = ? WHERE telegram_id = ?").bind(hasAny, sellerId).run();
}

async function getPotionQtyInInventory(db: D1, playerId: number, itemKey: string): Promise<number> {
  const row = await db
    .prepare("SELECT quantity FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ?")
    .bind(playerId, itemKey)
    .first();
  return row?.quantity ?? 0;
}

export async function inventoryHasRoomForOne(db: D1, playerId: number, itemKey: string): Promise<boolean> {
  const currentQty = await getPotionQtyInInventory(db, playerId, itemKey);
  if (currentQty > 0) return currentQty < MAX_POTION_STACK_PER_TYPE;

  const typesRow = await db
    .prepare("SELECT COUNT(*) as cnt FROM inventory_items WHERE player_id = ? AND item_type = 'potion'")
    .bind(playerId)
    .first();
  return (typesRow?.cnt ?? 0) < MAX_POTION_TYPES_IN_INVENTORY;
}

export async function addPotionToInventory(db: D1, playerId: number, itemKey: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inventory_items (player_id, item_type, item_key, quantity, equipped) VALUES (?, 'potion', ?, 1, 0)
       ON CONFLICT(player_id, item_type, item_key) DO UPDATE SET quantity = quantity + 1`
    )
    .bind(playerId, itemKey)
    .run();
}

async function removeOnePotionFromInventory(db: D1, playerId: number, itemKey: string): Promise<boolean> {
  const qty = await getPotionQtyInInventory(db, playerId, itemKey);
  if (qty <= 0) return false;
  if (qty === 1) {
    await db
      .prepare("DELETE FROM inventory_items WHERE player_id = ? AND item_type = 'potion' AND item_key = ?")
      .bind(playerId, itemKey)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE inventory_items SET quantity = quantity - 1 WHERE player_id = ? AND item_type = 'potion' AND item_key = ?"
      )
      .bind(playerId, itemKey)
      .run();
  }
  return true;
}

export type CreateListingResult = { ok: true; listingId: number } | { ok: false; error: string };

// شخص فروشنده باید خودش پوشن رو داشته باشه - با ثبت آگهی، یک واحد از اینونتوری خودش کم میشه
export async function createListing(
  db: D1,
  sellerId: number,
  house: string,
  itemKey: string,
  priceFc: number
): Promise<CreateListingResult> {
  if (!(MARKETPLACE_ALLOWED_PRICES_FC as readonly number[]).includes(priceFc)) {
    return { ok: false, error: "قیمت نامعتبر است. فقط 5/15/30/50/100 مجازه." };
  }

  const removed = await removeOnePotionFromInventory(db, sellerId, itemKey);
  if (!removed) return { ok: false, error: "شما این پوشن را در اینونتوری ندارید." };

  const result = await db
    .prepare(
      `INSERT INTO marketplace_listings (seller_id, house, item_key, price_fc, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?)`
    )
    .bind(sellerId, house, itemKey, priceFc, Date.now())
    .run();

  await recalcHasActiveListing(db, sellerId);
  return { ok: true, listingId: result.meta.last_row_id as number };
}

export async function listActiveByHouse(db: D1, house: string): Promise<MarketplaceListingRow[]> {
  const rows = await db
    .prepare("SELECT * FROM marketplace_listings WHERE house = ? AND status = 'active' ORDER BY created_at DESC")
    .bind(house)
    .all();
  return (rows.results ?? []).map(rowToListing);
}

export type CancelListingResult = { ok: true; returnedToInventory: boolean } | { ok: false; error: string };

export async function cancelListing(db: D1, sellerId: number, listingId: number): Promise<CancelListingResult> {
  const row = await db.prepare("SELECT * FROM marketplace_listings WHERE id = ?").bind(listingId).first();
  if (!row) return { ok: false, error: "آگهی پیدا نشد." };
  const listing = rowToListing(row);
  if (listing.sellerId !== sellerId) return { ok: false, error: "این آگهی مال شما نیست." };
  if (listing.status !== "active") return { ok: false, error: "این آگهی دیگر فعال نیست." };

  const hasRoom = await inventoryHasRoomForOne(db, sellerId, listing.itemKey);
  if (!hasRoom) {
    // طبق قانون: اگه جا نبود، پوشن همچنان توی لیست فروش میمونه (کنسل واقعی انجام نمیشه)
    return { ok: true, returnedToInventory: false };
  }

  await db.prepare("UPDATE marketplace_listings SET status = 'cancelled' WHERE id = ?").bind(listingId).run();
  await addPotionToInventory(db, sellerId, listing.itemKey);
  await recalcHasActiveListing(db, sellerId);
  return { ok: true, returnedToInventory: true };
}

export type BuyListingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function buyListing(db: D1, listingId: number, buyerId: number, buyerHouse: string): Promise<BuyListingResult> {
  const row = await db.prepare("SELECT * FROM marketplace_listings WHERE id = ?").bind(listingId).first();
  if (!row) return { ok: false, error: "آگهی پیدا نشد." };
  const listing = rowToListing(row);

  if (listing.status !== "active") return { ok: false, error: "این آگهی دیگر فعال نیست." };
  if (listing.house !== buyerHouse) return { ok: false, error: "این آگهی مخصوص خاندان شما نیست." };
  if (listing.sellerId === buyerId) return { ok: false, error: "نمی‌توانید آگهی خودتان را بخرید." };

  const hasRoom = await inventoryHasRoomForOne(db, buyerId, listing.itemKey);
  if (!hasRoom) return { ok: false, error: "اینونتوری پوشن شما جا ندارد." };

  const buyerRow = await db.prepare("SELECT coins_fc FROM players WHERE telegram_id = ?").bind(buyerId).first();
  if ((buyerRow?.coins_fc ?? 0) < listing.priceFc) return { ok: false, error: "سکه‌ی کافی ندارید." };

  await db
    .prepare("UPDATE players SET coins_fc = coins_fc - ?, updated_at = ? WHERE telegram_id = ?")
    .bind(listing.priceFc, Date.now(), buyerId)
    .run();
  await db
    .prepare("UPDATE players SET coins_fc = coins_fc + ?, updated_at = ? WHERE telegram_id = ?")
    .bind(listing.priceFc, Date.now(), listing.sellerId)
    .run();

  await addPotionToInventory(db, buyerId, listing.itemKey);
  await db.prepare("UPDATE marketplace_listings SET status = 'sold' WHERE id = ?").bind(listingId).run();
  await recalcHasActiveListing(db, listing.sellerId);

  return { ok: true };
}
