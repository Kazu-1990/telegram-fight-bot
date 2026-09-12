type D1 = any;

export type RegistrationStep = "awaiting_name" | "awaiting_house" | "awaiting_race" | "awaiting_photo";

export interface RegistrationData {
  name?: string;
  house?: string;
  race?: string;
}

export interface RegistrationSession {
  playerId: number;
  step: RegistrationStep;
  data: RegistrationData;
}

function now(): number {
  return Date.now();
}

export async function getRegistrationSession(db: D1, playerId: number): Promise<RegistrationSession | null> {
  const row = await db
    .prepare("SELECT * FROM registration_sessions WHERE player_id = ?")
    .bind(playerId)
    .first();
  if (!row) return null;
  return {
    playerId: row.player_id,
    step: row.step,
    data: JSON.parse(row.data_json),
  };
}

export async function startRegistrationSession(db: D1, playerId: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO registration_sessions (player_id, step, data_json, updated_at)
       VALUES (?, 'awaiting_name', '{}', ?)
       ON CONFLICT(player_id) DO UPDATE SET step = 'awaiting_name', data_json = '{}', updated_at = ?`
    )
    .bind(playerId, now(), now())
    .run();
}

export async function updateRegistrationSession(
  db: D1,
  playerId: number,
  step: RegistrationStep,
  data: RegistrationData
): Promise<void> {
  await db
    .prepare(
      `UPDATE registration_sessions SET step = ?, data_json = ?, updated_at = ? WHERE player_id = ?`
    )
    .bind(step, JSON.stringify(data), now(), playerId)
    .run();
}

export async function clearRegistrationSession(db: D1, playerId: number): Promise<void> {
  await db.prepare("DELETE FROM registration_sessions WHERE player_id = ?").bind(playerId).run();
}
