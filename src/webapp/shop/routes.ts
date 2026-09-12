import { verifyTelegramWebAppInitData } from "../shared/telegramAuth";
import {
  getArmorList,
  getWeaponList,
  purchaseArmor,
  purchaseWeapon,
  getPotionMarket,
  sellPotion,
  cancelPotionListing,
  buyPotionListing,
  getCraftInventory,
  craftAttempt,
  isApiError,
} from "./api";

type D1 = any;

export interface ShopApiEnv {
  DB: D1;
  BOT_TOKEN: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleShopApiRequest(request: Request, env: ShopApiEnv, path: string): Promise<Response> {
  if (request.method !== "POST") return json({ error: "متد نامعتبر" }, 405);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const { initData } = body;
  if (!initData) return json({ error: "initData الزامی است" }, 400);

  const verified = await verifyTelegramWebAppInitData(initData, env.BOT_TOKEN);
  if (!verified) return json({ error: "احراز هویت تلگرام نامعتبر است" }, 401);
  const userId = verified.userId;

  switch (path) {
    case "armor/list": {
      const result = await getArmorList(env.DB, userId);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "armor/buy": {
      const { itemKey } = body;
      const result = await purchaseArmor(env.DB, userId, itemKey);
      return result.ok ? json(result) : json(result, 400);
    }
    case "weapon/list": {
      const result = await getWeaponList(env.DB, userId);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "weapon/buy": {
      const { itemKey } = body;
      const result = await purchaseWeapon(env.DB, userId, itemKey);
      return result.ok ? json(result) : json(result, 400);
    }

    case "potion/market": {
      const result = await getPotionMarket(env.DB, userId);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "potion/sell": {
      const { itemKey, priceFc } = body;
      const result = await sellPotion(env.DB, userId, itemKey, priceFc);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "potion/cancel": {
      const { listingId } = body;
      const result = await cancelPotionListing(env.DB, userId, listingId);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "potion/buy": {
      const { listingId } = body;
      const result = await buyPotionListing(env.DB, userId, listingId);
      return isApiError(result) ? json(result, 400) : json(result);
    }

    case "craft/inventory": {
      const result = await getCraftInventory(env.DB, userId);
      return isApiError(result) ? json(result, 400) : json(result);
    }
    case "craft/attempt": {
      const { resources } = body;
      if (!Array.isArray(resources) || resources.length !== 3) {
        return json({ error: "باید دقیقاً سه ماده انتخاب کنید." }, 400);
      }
      const result = await craftAttempt(env.DB, userId, resources as [string, string, string]);
      return json(result);
    }

    default:
      return json({ error: "مسیر پیدا نشد" }, 404);
  }
}
