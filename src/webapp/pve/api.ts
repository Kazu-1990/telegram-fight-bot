import { getMatch, setMatchState, createSoloMatch, finishSoloMatch } from "../../db/queries/matches";
import { getPlayer, isPlayerBlocked, isPlayerRegistered } from "../../db/queries/players";
import { getEquippedGear } from "../../db/queries/inventory";
import { createFighterState } from "../../game/combat/engine";
import { createCpuState, resolvePveRound, resolvePveDeathDuelChoice, type PveCombatState } from "../../game/combat/pveEngine";
import type { DeathDuelChoice } from "../../game/combat/engine";
import { pickRandomForestEnemy } from "../../game/forest/enemies";
import { pickRandomDungeonEnemy } from "../../game/dungeon/enemies";
import { applyForestWin, applyForestLoss } from "../../game/forest/rewards";
import { applyDungeonWin, applyDungeonLoss } from "../../game/dungeon/rewards";
import { DUNGEON_MIN_LEVEL } from "../../config/constants";
import type { BodyPart, PlayerAction } from "../../types";

type D1 = any;
export type PveMatchType = "forest" | "dungeon";

export interface ApiError {
  error: string;
}
export function isApiError(x: unknown): x is ApiError {
  return typeof x === "object" && x !== null && "error" in x;
}

// ---------- شروع یک مبارزه‌ی تازه ----------
export async function startPveMatch(
  db: D1,
  userId: number,
  matchType: PveMatchType
): Promise<{ matchId: number; state: PveCombatState } | ApiError> {
  if (await isPlayerBlocked(db, userId)) return { error: "شما بلاک شده‌اید." };
  if (!(await isPlayerRegistered(db, userId))) return { error: "اول باید در پیوی ربات ثبت‌نام کنید." };

  const player = await getPlayer(db, userId);
  if (!player || !player.race) return { error: "اطلاعات بازیکن پیدا نشد." };

  if (matchType === "dungeon" && player.level < DUNGEON_MIN_LEVEL) {
    return { error: `این بخش از لول ${DUNGEON_MIN_LEVEL} به بالا باز می‌شود.` };
  }

  const cooldownUntil = matchType === "forest" ? player.forestCooldownUntil : player.dungeonCooldownUntil;
  if (cooldownUntil && cooldownUntil > Date.now()) {
    const minutes = Math.ceil((cooldownUntil - Date.now()) / 60_000);
    return { error: `به دلیل باخت اخیر، ${minutes} دقیقه دیگر باید صبر کنید.` };
  }

  const enemyDef = matchType === "forest" ? pickRandomForestEnemy() : pickRandomDungeonEnemy();
  const gear = await getEquippedGear(db, userId);
  const fighter = createFighterState(userId, player.race, {
    hpMax: player.hpMax,
    level: player.level,
    name: player.name ?? undefined,
    house: player.house ?? undefined,
    ...gear,
  });
  const cpu = createCpuState(enemyDef);

  const state: PveCombatState = { round: 1, player: fighter, cpu, log: [], isDeathDuel: false };
  const matchId = await createSoloMatch(db, matchType, userId, enemyDef.key);
  await setMatchState(db, matchId, state as unknown as Record<string, unknown>);

  return { matchId, state };
}

// ---------- گرفتن وضعیت فعلی ----------
export async function getPveState(
  db: D1,
  matchId: number,
  userId: number
): Promise<{ state: PveCombatState; status: string } | ApiError> {
  const match = await getMatch(db, matchId);
  if (!match || (match.type !== "forest" && match.type !== "dungeon")) return { error: "مبارزه پیدا نشد." };
  if (match.player1Id !== userId) return { error: "این مبارزه‌ی شما نیست." };
  if (!match.state) return { error: "وضعیت بازی هنوز آماده نشده." };
  return { state: match.state as unknown as PveCombatState, status: match.status };
}

// ---------- ثبت اکشن (پوشن غیرمجازه) ----------
export async function submitPveAction(
  db: D1,
  matchId: number,
  userId: number,
  action: PlayerAction,
  target?: BodyPart
): Promise<{ state: PveCombatState; outcome: string; reward?: unknown } | ApiError> {
  if (action === "potion") return { error: "استفاده از پوشن در این بخش مجاز نیست." };

  const match = await getMatch(db, matchId);
  if (!match || (match.type !== "forest" && match.type !== "dungeon")) return { error: "مبارزه پیدا نشد." };
  if (match.player1Id !== userId) return { error: "این مبارزه‌ی شما نیست." };
  if (match.status !== "active" || !match.state) return { error: "این مبارزه فعال نیست." };

  const state = match.state as unknown as PveCombatState;

  let outcome;
  try {
    outcome = resolvePveRound(state, { action, target });
  } catch (e: any) {
    // مثلا وقتی آلتیمیت با مانای ناقص یا سقف تمام‌شده امتحان بشه - راند مصرف نمیشه
    return { error: e.message ?? "اکشن نامعتبر" };
  }

  await setMatchState(db, matchId, state as unknown as Record<string, unknown>);

  if (outcome.status === "ongoing") {
    return { state, outcome: outcome.status };
  }

  const playerWon = outcome.status === "player_won";
  await finishSoloMatch(db, matchId, playerWon, userId);

  let reward: unknown;
  if (match.type === "forest") {
    if (playerWon) reward = await applyForestWin(db, userId);
    else await applyForestLoss(db, userId);
  } else {
    if (playerWon) reward = await applyDungeonWin(db, userId);
    else await applyDungeonLoss(db, userId);
  }

  return { state, outcome: outcome.status, reward };
}

// ---------- انتخاب در دوئل مرگ (وقتی پلیر و CPU همزمان صفر شدن) ----------
export async function submitPveDeathDuelChoice(
  db: D1,
  matchId: number,
  userId: number,
  choice: DeathDuelChoice
): Promise<{ state: PveCombatState; winner: "player" | "cpu" | null; reward?: unknown } | ApiError> {
  const match = await getMatch(db, matchId);
  if (!match || (match.type !== "forest" && match.type !== "dungeon")) return { error: "مبارزه پیدا نشد." };
  if (match.player1Id !== userId) return { error: "این مبارزه‌ی شما نیست." };
  if (!match.state) return { error: "این مبارزه فعال نیست." };

  const state = match.state as unknown as PveCombatState;
  if (!state.isDeathDuel) return { error: "در حالت دوئل مرگ نیستیم." };

  const result = resolvePveDeathDuelChoice(state, choice);

  if (result.winner === null) {
    await setMatchState(db, matchId, state as unknown as Record<string, unknown>);
    return { state, winner: null };
  }

  const playerWon = result.winner === "player";
  await finishSoloMatch(db, matchId, playerWon, userId);
  await setMatchState(db, matchId, state as unknown as Record<string, unknown>);

  let reward: unknown;
  if (match.type === "forest") {
    if (playerWon) reward = await applyForestWin(db, userId);
    else await applyForestLoss(db, userId);
  } else {
    if (playerWon) reward = await applyDungeonWin(db, userId);
    else await applyDungeonLoss(db, userId);
  }

  return { state, winner: result.winner, reward };
}
