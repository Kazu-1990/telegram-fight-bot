type D1 = any;

export interface PlayerListEntry {
  telegramId: number;
  name: string;
  house: string;
  race: string;
}

// همه‌ی بازیکنان ثبت‌نام‌کرده، با آخرین ویرایش‌شده بالاتر
export async function getAllPlayersOrderedByUpdated(db: D1): Promise<PlayerListEntry[]> {
  const rows = await db
    .prepare(
      `SELECT telegram_id, name, house, race FROM players
       WHERE is_registered = 1
       ORDER BY updated_at DESC`
    )
    .all();

  return (rows.results ?? []).map((r: any) => ({
    telegramId: r.telegram_id,
    name: r.name,
    house: r.house,
    race: r.race,
  }));
}

// ترتیب دقیق آخرین /list یک کارمند رو ذخیره میکنه تا «حذف N» بدونه منظور کیه
export async function saveStaffListSession(db: D1, staffId: number, playerIds: number[]): Promise<void> {
  await db
    .prepare(
      `INSERT INTO staff_list_sessions (staff_id, player_ids_json, created_at) VALUES (?, ?, ?)
       ON CONFLICT(staff_id) DO UPDATE SET player_ids_json = ?, created_at = ?`
    )
    .bind(staffId, JSON.stringify(playerIds), Date.now(), JSON.stringify(playerIds), Date.now())
    .run();
}

export async function getStaffListSession(db: D1, staffId: number): Promise<number[] | null> {
  const row = await db
    .prepare("SELECT player_ids_json FROM staff_list_sessions WHERE staff_id = ?")
    .bind(staffId)
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.player_ids_json as string);
  } catch {
    return null;
  }
}

// حذف کامل یک بازیکن - پروفایل، اینونتوری، آگهی‌های فروشش، و سشن‌های موقتش
// بعد از این، اگه دوباره بخواد بازی کنه باید از صفر ثبت‌نام کنه
export async function deletePlayerCompletely(db: D1, telegramId: number): Promise<void> {
  await db.prepare("DELETE FROM inventory_items WHERE player_id = ?").bind(telegramId).run();
  await db.prepare("DELETE FROM marketplace_listings WHERE seller_id = ?").bind(telegramId).run();
  await db.prepare("DELETE FROM registration_sessions WHERE player_id = ?").bind(telegramId).run();
  await db.prepare("DELETE FROM group_activation_sessions WHERE player_id = ?").bind(telegramId).run();
  await db.prepare("DELETE FROM staff_list_sessions WHERE staff_id = ?").bind(telegramId).run();
  await db.prepare("DELETE FROM players WHERE telegram_id = ?").bind(telegramId).run();
}
