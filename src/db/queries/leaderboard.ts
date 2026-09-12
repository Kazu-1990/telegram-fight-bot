export interface LeaderboardEntry {
  telegramId: number;
  name: string | null;
  house: string | null;
  race: string | null;
  seasonWins: number;
}

type D1 = any;

export async function getTopPlayers(db: D1, limit = 10): Promise<LeaderboardEntry[]> {
  const rows = await db
    .prepare(
      `SELECT telegram_id, name, house, race, season_wins FROM players
       WHERE is_registered = 1
       ORDER BY season_wins DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  return (rows.results ?? []).map((r: any) => ({
    telegramId: r.telegram_id,
    name: r.name,
    house: r.house,
    race: r.race,
    seasonWins: r.season_wins,
  }));
}

// فقط season_wins صفر میشه؛ total_wins (که توی پروفایل نشون داده میشه) دست نمیخوره
export async function resetSeasonWins(db: D1): Promise<void> {
  await db.prepare("UPDATE players SET season_wins = 0").run();
}
