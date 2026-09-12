import type { Match, CombatState, MatchType, MatchStatus } from "../../types";

type D1 = any;

function now(): number {
  return Date.now();
}

function rowToMatch(row: any): Match {
  return {
    id: row.id,
    type: row.type,
    chatId: row.chat_id,
    groupMessageId: row.group_message_id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    enemyKey: row.enemy_key,
    status: row.status,
    state: row.state_json ? JSON.parse(row.state_json) : null,
    winnerId: row.winner_id,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

// forest/dungeon: برخلاف duel، منتظر نفر دوم نمیمونه - همون لحظه فعال ساخته میشه
export async function createSoloMatch(db: D1, type: "forest" | "dungeon", playerId: number, enemyKey: string): Promise<number> {
  const result = await db
    .prepare(`INSERT INTO matches (type, player1_id, enemy_key, status, created_at) VALUES (?, ?, ?, 'active', ?)`)
    .bind(type, playerId, enemyKey, now())
    .run();
  return result.meta.last_row_id as number;
}

export async function finishSoloMatch(db: D1, matchId: number, playerWon: boolean, playerId: number): Promise<void> {
  await db
    .prepare("UPDATE matches SET status = 'finished', winner_id = ?, finished_at = ? WHERE id = ?")
    .bind(playerWon ? playerId : null, now(), matchId)
    .run();
}

export async function getMatch(db: D1, matchId: number): Promise<Match | null> {
  const row = await db.prepare("SELECT * FROM matches WHERE id = ?").bind(matchId).first();
  return row ? rowToMatch(row) : null;
}

// duel: فضای دعوت خالی ایجاد میشه، player1/player2 هنوز مشخص نیستن
export async function createWaitingDuelMatch(db: D1, chatId: number): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO matches (type, chat_id, status, created_at) VALUES ('duel', ?, 'waiting', ?)`
    )
    .bind(chatId, now())
    .run();
  return result.meta.last_row_id as number;
}

export async function setGroupMessageId(db: D1, matchId: number, messageId: number): Promise<void> {
  await db.prepare("UPDATE matches SET group_message_id = ? WHERE id = ?").bind(messageId, matchId).run();
}

export type JoinResult =
  | { outcome: "joined_as_first" }
  | { outcome: "joined_as_second"; match: Match }
  | { outcome: "already_joined" }
  | { outcome: "full" }
  | { outcome: "not_waiting" };

// یک نفر روی «ورود به مبارزه» میزنه - اولی و دومی که کلیک کنن حریف میشن
export async function joinDuelMatch(db: D1, matchId: number, userId: number): Promise<JoinResult> {
  const match = await getMatch(db, matchId);
  if (!match) return { outcome: "not_waiting" };
  if (match.status !== "waiting") return { outcome: "not_waiting" };

  if (match.player1Id === userId || match.player2Id === userId) {
    return { outcome: "already_joined" };
  }

  if (match.player1Id === null) {
    await db.prepare("UPDATE matches SET player1_id = ? WHERE id = ?").bind(userId, matchId).run();
    return { outcome: "joined_as_first" };
  }

  if (match.player2Id === null) {
    await db.prepare("UPDATE matches SET player2_id = ?, status = 'active' WHERE id = ?").bind(userId, matchId).run();
    const updated = await getMatch(db, matchId);
    return { outcome: "joined_as_second", match: updated! };
  }

  return { outcome: "full" };
}

export async function setMatchState(db: D1, matchId: number, state: CombatState | Record<string, unknown>): Promise<void> {
  await db.prepare("UPDATE matches SET state_json = ? WHERE id = ?").bind(JSON.stringify(state), matchId).run();
}

export async function setMatchStatus(db: D1, matchId: number, status: MatchStatus): Promise<void> {
  await db.prepare("UPDATE matches SET status = ? WHERE id = ?").bind(status, matchId).run();
}

// اتمام بازی duel - برد به حساب برنده (season_wins و total_wins) اضافه میشه
export async function finishDuelMatch(db: D1, matchId: number, winnerId: number): Promise<void> {
  const t = now();
  await db
    .prepare("UPDATE matches SET status = 'finished', winner_id = ?, finished_at = ? WHERE id = ?")
    .bind(winnerId, t, matchId)
    .run();
  await db
    .prepare(
      "UPDATE players SET total_wins = total_wins + 1, season_wins = season_wins + 1, updated_at = ? WHERE telegram_id = ?"
    )
    .bind(t, winnerId)
    .run();
}

// کنسل کردن توسط کارمند - هیچ تغییری (برد/بازنده) ثبت نمیشه
export async function cancelMatch(db: D1, matchId: number): Promise<void> {
  await db.prepare("UPDATE matches SET status = 'cancelled', finished_at = ? WHERE id = ?").bind(now(), matchId).run();
}

export async function expireMatch(db: D1, matchId: number): Promise<void> {
  await db.prepare("UPDATE matches SET status = 'expired', finished_at = ? WHERE id = ?").bind(now(), matchId).run();
}

export function isWaitingExpired(match: Match, expiryMs: number): boolean {
  return match.status === "waiting" && Date.now() - match.createdAt > expiryMs;
}
