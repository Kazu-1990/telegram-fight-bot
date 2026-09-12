import type { CombatState, FighterState, BodyPart, PlayerAction, PotionKey } from "../../types";
import { getMatch, setMatchState } from "../../db/queries/matches";
import { getPotionQuantity, decrementPotionQuantity } from "../../db/queries/inventory";
import {
  submitAction,
  usePotion,
  bothFightersReady,
  resolveRound,
  submitDeathDuelChoice,
  resolveDeathDuel,
  type RoundOutcome,
  type DeathDuelChoice,
} from "../../game/combat/engine";

type D1 = any;

export interface ApiError {
  error: string;
}

export interface ApiResult {
  state: RedactedCombatState;
  outcome: RoundOutcome | { status: "death_duel_ongoing" } | { status: "death_duel_tie" };
  winnerUserId?: number; // فقط وقتی outcome.status === "winner" پر میشه - برای بستن پیام گروه لازمه
}

// نسخه‌ی «امن برای نمایش» - اکشن راندِ در انتظار حریف رو فاش نمیکنه، فقط میگه ثبت شده یا نه
export interface RedactedFighter extends Omit<FighterState, "pendingAction"> {
  hasSubmittedAction: boolean;
}
export interface RedactedCombatState extends Omit<CombatState, "fighters"> {
  fighters: [RedactedFighter, RedactedFighter];
  yourIndex: 0 | 1;
}

function redact(state: CombatState, viewerIndex: 0 | 1): RedactedCombatState {
  const fighters = state.fighters.map((f) => {
    const { pendingAction, ...rest } = f;
    return { ...rest, hasSubmittedAction: pendingAction !== null };
  }) as [RedactedFighter, RedactedFighter];

  return { ...state, fighters, yourIndex: viewerIndex };
}

async function loadMatchAndIndex(
  db: D1,
  matchId: number,
  userId: number
): Promise<{ state: CombatState; fighterIndex: 0 | 1 } | ApiError> {
  const match = await getMatch(db, matchId);
  if (!match || match.type !== "duel") return { error: "مبارزه پیدا نشد." };
  if (match.status !== "active") return { error: "این مبارزه فعال نیست." };
  if (!match.state) return { error: "وضعیت بازی هنوز آماده نشده." };

  let fighterIndex: 0 | 1;
  if (match.player1Id === userId) fighterIndex = 0;
  else if (match.player2Id === userId) fighterIndex = 1;
  else return { error: "شما در این مبارزه حریف نیستید." };

  return { state: match.state, fighterIndex };
}

function isApiError(x: unknown): x is ApiError {
  return typeof x === "object" && x !== null && "error" in x;
}

// ---------- GET - گرفتن وضعیت فعلی ----------
export async function getDuelStateForUser(db: D1, matchId: number, userId: number): Promise<RedactedCombatState | ApiError> {
  const loaded = await loadMatchAndIndex(db, matchId, userId);
  if (isApiError(loaded)) return loaded;
  return redact(loaded.state, loaded.fighterIndex);
}

// ---------- POST - ثبت اکشن اصلی راند ----------
export async function submitDuelAction(
  db: D1,
  matchId: number,
  userId: number,
  action: PlayerAction,
  target?: BodyPart
): Promise<ApiResult | ApiError> {
  const loaded = await loadMatchAndIndex(db, matchId, userId);
  if (isApiError(loaded)) return loaded;
  const { state, fighterIndex } = loaded;

  try {
    submitAction(state, fighterIndex, action, target);
  } catch (e: any) {
    return { error: e.message ?? "اکشن نامعتبر" };
  }

  let outcome: ApiResult["outcome"] = { status: "ongoing" };
  let winnerUserId: number | undefined;

  if (bothFightersReady(state)) {
    outcome = resolveRound(state);
    if (outcome.status === "winner") {
      winnerUserId = state.fighters[outcome.winnerIndex].id as number;
    }
  }

  await setMatchState(db, matchId, state);
  return { state: redact(state, fighterIndex), outcome, winnerUserId };
}

// ---------- POST - استفاده از پوشن (نوبت رو تموم نمیکنه) ----------
export async function useDuelPotion(
  db: D1,
  matchId: number,
  userId: number,
  potionKey: PotionKey
): Promise<ApiResult | ApiError> {
  const loaded = await loadMatchAndIndex(db, matchId, userId);
  if (isApiError(loaded)) return loaded;
  const { state, fighterIndex } = loaded;

  // چک اینونتوری واقعی - قبل از مصرف توی combat state
  const qty = await getPotionQuantity(db, userId, potionKey);
  if (qty <= 0) return { error: "شما این پوشن را در اینونتوری ندارید." };

  try {
    usePotion(state, fighterIndex, potionKey);
  } catch (e: any) {
    return { error: e.message ?? "امکان استفاده از پوشن نیست" };
  }

  await decrementPotionQuantity(db, userId, potionKey);
  await setMatchState(db, matchId, state);
  return { state: redact(state, fighterIndex), outcome: { status: "ongoing" } };
}

// ---------- POST - انتخاب در دوئل مرگ ----------
export async function submitDuelDeathDuelChoice(
  db: D1,
  matchId: number,
  userId: number,
  choice: DeathDuelChoice
): Promise<ApiResult | ApiError> {
  const loaded = await loadMatchAndIndex(db, matchId, userId);
  if (isApiError(loaded)) return loaded;
  const { state, fighterIndex } = loaded;

  if (!state.isDeathDuel) return { error: "بازی هنوز وارد دوئل مرگ نشده." };

  try {
    submitDeathDuelChoice(state, fighterIndex, choice);
  } catch (e: any) {
    return { error: e.message ?? "انتخاب نامعتبر" };
  }

  let outcome: ApiResult["outcome"] = { status: "death_duel_ongoing" };
  let winnerUserId: number | undefined;

  const winnerIndex = resolveDeathDuel(state);
  if (winnerIndex !== null) {
    outcome = { status: "winner", winnerIndex };
    winnerUserId = state.fighters[winnerIndex].id as number;
  } else if (state.deathDuelChoices[0] === null && state.deathDuelChoices[1] === null) {
    // یعنی resolveDeathDuel تای رو تشخیص داد و ریست کرد
    outcome = { status: "death_duel_tie" };
  }

  await setMatchState(db, matchId, state);
  return { state: redact(state, fighterIndex), outcome, winnerUserId };
}
