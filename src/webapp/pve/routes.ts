import { verifyTelegramWebAppInitData } from "../shared/telegramAuth";
import { startPveMatch, getPveState, submitPveAction, submitPveDeathDuelChoice, isApiError, type PveMatchType } from "./api";

type D1 = any;

export interface PveApiEnv {
  DB: D1;
  BOT_TOKEN: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function authenticate(env: PveApiEnv, initData: string): Promise<number | null> {
  const verified = await verifyTelegramWebAppInitData(initData, env.BOT_TOKEN);
  return verified ? verified.userId : null;
}

// مسیرها زیر یک مسیر پایه مثل /api/forest/... یا /api/dungeon/... مونت میشن
// matchType از خودِ روتر اصلی (بر اساس اینکه کدوم مسیر صدا زده شده) به اینجا پاس داده میشه
export async function handlePveApiRequest(
  request: Request,
  env: PveApiEnv,
  matchType: PveMatchType,
  path: string
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "متد نامعتبر" }, 405);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const { initData } = body;
  if (!initData) return json({ error: "initData الزامی است" }, 400);

  const userId = await authenticate(env, initData);
  if (!userId) return json({ error: "احراز هویت تلگرام نامعتبر است" }, 401);

  switch (path) {
    case "start": {
      const result = await startPveMatch(env.DB, userId, matchType);
      return isApiError(result) ? json(result, 400) : json(result);
    }

    case "state": {
      const { matchId } = body;
      if (!matchId) return json({ error: "matchId الزامی است" }, 400);
      const result = await getPveState(env.DB, matchId, userId);
      return isApiError(result) ? json(result, 400) : json(result);
    }

    case "action": {
      const { matchId, action, target } = body;
      if (!matchId) return json({ error: "matchId الزامی است" }, 400);
      const result = await submitPveAction(env.DB, matchId, userId, action, target);
      return isApiError(result) ? json(result, 400) : json(result);
    }

    case "death-duel-choice": {
      const { matchId, choice } = body;
      if (!matchId) return json({ error: "matchId الزامی است" }, 400);
      const result = await submitPveDeathDuelChoice(env.DB, matchId, userId, choice);
      return isApiError(result) ? json(result, 400) : json(result);
    }

    default:
      return json({ error: "مسیر پیدا نشد" }, 404);
  }
}
