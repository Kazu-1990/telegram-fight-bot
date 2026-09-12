type D1 = any;

// TODO(فاز بعد): activateGroup, deactivateGroup و سایر کوئری‌های مربوط به فعال‌سازی
// اینجا اضافه میشن. فعلاً فقط چک ساده‌ی «آیا گروه مجازه؟» لازمه.

export async function isGroupActive(db: D1, chatId: number): Promise<boolean> {
  const row = await db.prepare("SELECT is_active FROM groups WHERE chat_id = ?").bind(chatId).first();
  return !!row?.is_active;
}

export async function activateGroup(db: D1, chatId: number, activatedByUserId: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO groups (chat_id, is_active, activated_by_user_id, activated_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET is_active = 1, activated_by_user_id = ?, activated_at = ?`
    )
    .bind(chatId, activatedByUserId, Date.now(), activatedByUserId, Date.now())
    .run();
}
