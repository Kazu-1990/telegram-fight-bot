type D1 = any;

export async function setPendingGroupActivation(db: D1, playerId: number, chatId: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO group_activation_sessions (player_id, chat_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET chat_id = ?, updated_at = ?`
    )
    .bind(playerId, chatId, Date.now(), chatId, Date.now())
    .run();
}

export async function getPendingGroupActivation(db: D1, playerId: number): Promise<number | null> {
  const row = await db
    .prepare("SELECT chat_id FROM group_activation_sessions WHERE player_id = ?")
    .bind(playerId)
    .first();
  return row?.chat_id ?? null;
}

export async function clearPendingGroupActivation(db: D1, playerId: number): Promise<void> {
  await db.prepare("DELETE FROM group_activation_sessions WHERE player_id = ?").bind(playerId).run();
}
