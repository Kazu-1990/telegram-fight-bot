import { getPlayer, isPlayerBlocked, isPlayerRegistered } from "../../db/queries/players";
import { getInventoryByType } from "../../db/queries/inventory";
import { createListing, listActiveByHouse, cancelListing, buyListing } from "../../db/queries/marketplace";
import { attemptCraft } from "../../db/queries/craft";
import { MIN_LEVEL_FOR_CRAFT, CRAFT_ATTEMPT_COST_FC, MARKETPLACE_ALLOWED_PRICES_FC } from "../../config/constants";

type D1 = any;

export interface ApiError {
  error: string;
}
export function isApiError(x: unknown): x is ApiError {
  return typeof x === "object" && x !== null && "error" in x;
}

async function requireActivePlayer(db: D1, userId: number) {
  if (await isPlayerBlocked(db, userId)) return { error: "شما بلاک شده‌اید." } as ApiError;
  if (!(await isPlayerRegistered(db, userId))) return { error: "اول باید ثبت‌نام کنید." } as ApiError;
  const player = await getPlayer(db, userId);
  if (!player || !player.house) return { error: "اطلاعات بازیکن پیدا نشد." } as ApiError;
  return player;
}

// ---------- آرمور ----------
// فعلاً غیرفعاله - «در دست ساخت است» نشون داده میشه
export async function getArmorList(db: D1, userId: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;
  return { disabled: true, message: "در دست ساخت است", coinsFc: player.coinsFc };
}

export async function purchaseArmor(_db: D1, _userId: number, _armorKey: string) {
  return { ok: false, error: "این بخش در دست ساخت است." };
}

// ---------- سلاح ----------
// فعلاً غیرفعاله - «در دست ساخت است» نشون داده میشه
export async function getWeaponList(db: D1, userId: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;
  return { disabled: true, message: "در دست ساخت است", coinsFc: player.coinsFc };
}

export async function purchaseWeapon(_db: D1, _userId: number, _weaponKey: string) {
  return { ok: false, error: "این بخش در دست ساخت است." };
}

// ---------- بازار پوشن ----------
export async function getPotionMarket(db: D1, userId: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;

  const listings = await listActiveByHouse(db, player.house!);
  const myPotions = await getInventoryByType(db, userId, "potion");
  return { listings, myPotions, coinsFc: player.coinsFc, allowedPrices: MARKETPLACE_ALLOWED_PRICES_FC };
}

export async function sellPotion(db: D1, userId: number, itemKey: string, priceFc: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;

  const result = await createListing(db, userId, player.house!, itemKey, priceFc);
  return result.ok ? { ok: true, listingId: result.listingId } : { error: result.error };
}

export async function cancelPotionListing(db: D1, userId: number, listingId: number) {
  const result = await cancelListing(db, userId, listingId);
  if (!result.ok) return { error: result.error };
  return { ok: true, returnedToInventory: result.returnedToInventory };
}

export async function buyPotionListing(db: D1, userId: number, listingId: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;

  const result = await buyListing(db, listingId, userId, player.house!);
  return result.ok ? { ok: true } : { error: result.error };
}

// ---------- کرفت ----------
export async function getCraftInventory(db: D1, userId: number) {
  const player = await requireActivePlayer(db, userId);
  if (isApiError(player)) return player;

  const resources = await getInventoryByType(db, userId, "resource");
  return { resources, minLevel: MIN_LEVEL_FOR_CRAFT, costPerAttempt: CRAFT_ATTEMPT_COST_FC, playerLevel: player.level };
}

export async function craftAttempt(db: D1, userId: number, resources: [string, string, string]) {
  return attemptCraft(db, userId, resources);
}
