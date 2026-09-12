import { ANTISPAM_WINDOW_MS, ANTISPAM_MAX_COMMANDS, ANTISPAM_BLOCK_REASON } from "../../config/constants";
import { blockPlayer } from "../../db/queries/players";

type D1 = any;

// هر دستور رو لاگ میکنه و اگه از سقف مجاز توی بازه‌ی زمانی رد شده باشه، خودکار بلاک میکنه
// خروجی true یعنی همین الان بلاک شد (پیام اسپم باید نشون داده بشه)
export async function checkAndRecordSpam(db: D1, playerId: number, command: string): Promise<boolean> {
  const now = Date.now();

  await db
    .prepare("INSERT INTO command_log (player_id, command, created_at) VALUES (?, ?, ?)")
    .bind(playerId, command, now)
    .run();

  const windowStart = now - ANTISPAM_WINDOW_MS;
  const row = await db
    .prepare("SELECT COUNT(*) as cnt FROM command_log WHERE player_id = ? AND created_at >= ?")
    .bind(playerId, windowStart)
    .first();

  const count = row?.cnt ?? 0;
  if (count > ANTISPAM_MAX_COMMANDS) {
    await blockPlayer(db, playerId, ANTISPAM_BLOCK_REASON);
    return true;
  }
  return false;
}
