import { verifyTelegramWebAppInitData } from "../shared/telegramAuth";
import { getDuelStateForUser, submitDuelAction, useDuelPotion, submitDuelDeathDuelChoice } from "./api";
import { closeDuelMatch } from "../../bot/commands/duel";

type D1 = any;

export interface DuelApiEnv {
  DB: D1;
  BOT_TOKEN: string;
  bot: { api: { editMessageText: (chatId: number, messageId: number, text: string, opts?: any) => Promise<unknown> } };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function authenticate(env: DuelApiEnv, initData: string): Promise<number | null> {
  const verified = await verifyTelegramWebAppInitData(initData, env.BOT_TOKEN);
  return verified ? verified.userId : null;
}

// اگه نتیجه "winner" بود، هم برد ثبت میشه هم پیام گروه بسته میشه
async function maybeCloseMatch(env: DuelApiEnv, matchId: number, winnerUserId?: number): Promise<void> {
  if (winnerUserId) {
    await closeDuelMatch(env.bot, env.DB, matchId, winnerUserId);
  }
}

// همه‌ی مسیرها زیر یک مسیر پایه مثل /api/duel/... مونت میشن
// روش فراخوانی: fetch با متد POST و بدنه‌ی JSON شامل initData, matchId, و بقیه پارامترها
export async function handleDuelApiRequest(request: Request, env: DuelApiEnv, path: string): Promise<Response> {
  if (request.method !== "POST") return json({ error: "متد نامعتبر" }, 405);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const { initData, matchId } = body;
  if (!initData || !matchId) return json({ error: "initData و matchId الزامی‌اند" }, 400);

  const userId = await authenticate(env, initData);
  if (!userId) return json({ error: "احراز هویت تلگرام نامعتبر است" }, 401);

  switch (path) {
    case "state": {
      const result = await getDuelStateForUser(env.DB, matchId, userId);
      return "error" in result ? json(result, 400) : json(result);
    }

    case "action": {
      const { action, target } = body;
      const result = await submitDuelAction(env.DB, matchId, userId, action, target);
      if ("error" in result) return json(result, 400);
      await maybeCloseMatch(env, matchId, result.winnerUserId);
      return json(result);
    }

    case "potion": {
      const { potionKey } = body;
      const result = await useDuelPotion(env.DB, matchId, userId, potionKey);
      return "error" in result ? json(result, 400) : json(result);
    }

    case "death-duel-choice": {
      const { choice } = body;
      const result = await submitDuelDeathDuelChoice(env.DB, matchId, userId, choice);
      if ("error" in result) return json(result, 400);
      await maybeCloseMatch(env, matchId, result.winnerUserId);
      return json(result);
    }

    default:
      return json({ error: "مسیر پیدا نشد" }, 404);
  }
}
