-- =========================================================
-- اسکیمای دیتابیس - Cloudflare D1 (SQLite)
-- =========================================================

CREATE TABLE IF NOT EXISTS players (
  telegram_id       INTEGER PRIMARY KEY,
  is_registered     INTEGER NOT NULL DEFAULT 0, -- 0/1
  name              TEXT,
  house             TEXT,      -- stalker | evans | scott
  race              TEXT,      -- werewolf | vampire | elf | witcher
  photo_file_id     TEXT,
  title             TEXT,      -- لقب - فعلاً مکانیزم ست‌کردنش تعریف نشده، فقط فیلدش آماده‌ست

  level             INTEGER NOT NULL DEFAULT 1,
  xp                INTEGER NOT NULL DEFAULT 0,
  coins_fc          INTEGER NOT NULL DEFAULT 0,

  hp_max            INTEGER NOT NULL DEFAULT 200,

  total_wins        INTEGER NOT NULL DEFAULT 0,  -- هیچوقت ریست نمیشه (پروفایل) - فقط بردهای duel
  season_wins       INTEGER NOT NULL DEFAULT 0,  -- با /resetboard صفر میشه (جدول امتیازات) - فقط duel
  league_stars      INTEGER NOT NULL DEFAULT 0,  -- /star و /antistar

  forest_wins_total  INTEGER NOT NULL DEFAULT 0, -- برای تریگر آیتم جایزه هر ۵ برد
  dungeon_wins_total INTEGER NOT NULL DEFAULT 0,

  is_blocked        INTEGER NOT NULL DEFAULT 0,
  block_reason      TEXT,

  forest_cooldown_until  INTEGER, -- timestamp ms، NULL یعنی آزاده
  dungeon_cooldown_until INTEGER,

  -- فروشنده‌ای که آیتمش هنوز روی مارکت‌پلیسه، نمیتونه ویرایش کنه
  has_active_listing INTEGER NOT NULL DEFAULT 0,

  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   INTEGER NOT NULL REFERENCES players(telegram_id),
  item_type   TEXT NOT NULL,  -- potion | armor | weapon | resource
  item_key    TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  equipped    INTEGER NOT NULL DEFAULT 0, -- فقط armor/weapon
  image_url   TEXT, -- برای آینده، فعلا NULL

  UNIQUE(player_id, item_type, item_key)
);
CREATE INDEX IF NOT EXISTS idx_inventory_player ON inventory_items(player_id);

CREATE TABLE IF NOT EXISTS groups (
  chat_id             INTEGER PRIMARY KEY,
  is_active           INTEGER NOT NULL DEFAULT 0,
  activated_by_user_id INTEGER,
  activated_at         INTEGER
);

CREATE TABLE IF NOT EXISTS matches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,   -- duel | forest | dungeon
  chat_id     INTEGER,         -- فقط duel
  group_message_id INTEGER,    -- آیدی پیام دعوت در گروه (برای ادیت بعدی)
  player1_id  INTEGER,
  player2_id  INTEGER,
  enemy_key   TEXT,            -- فقط forest/dungeon
  status      TEXT NOT NULL,   -- waiting | active | finished | cancelled | expired
  state_json  TEXT,            -- CombatState به صورت JSON
  winner_id   INTEGER,
  created_at  INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_chat ON matches(chat_id);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id   INTEGER NOT NULL REFERENCES players(telegram_id),
  house       TEXT NOT NULL,     -- برای فیلتر خریداران هم‌خاندان
  item_key    TEXT NOT NULL,     -- کلید پوشن
  price_fc    INTEGER NOT NULL,  -- فقط مقادیر مجاز: 5/15/30/50/100
  status      TEXT NOT NULL DEFAULT 'active', -- active | cancelled | sold
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketplace_house_status ON marketplace_listings(house, status);

-- وقتی کاربر از طریق دیپ‌لینک (start=activate_<chatId>) وارد پیوی میشه و منتظر واردکردن کده
CREATE TABLE IF NOT EXISTS group_activation_sessions (
  player_id   INTEGER PRIMARY KEY,
  chat_id     INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- وضعیت موقتِ ویزارد ثبت‌نام/ویرایش (اسم -> خاندان -> نژاد -> عکس)
-- چون Cloudflare Workers استیت رو بین ریکوئست‌ها نگه نمی‌داره، این جدول جای session رو می‌گیره
CREATE TABLE IF NOT EXISTS registration_sessions (
  player_id   INTEGER PRIMARY KEY,
  step        TEXT NOT NULL,   -- awaiting_name | awaiting_house | awaiting_race | awaiting_photo
  data_json   TEXT NOT NULL,   -- داده‌های جمع‌شده تا این لحظه (name/house/race)
  updated_at  INTEGER NOT NULL
);

-- لاگ ضدِ اسپم - فقط تایم‌استمپ آخرین دستورهای هر کاربر برای شمارش پنجره زمانی
CREATE TABLE IF NOT EXISTS command_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    INTEGER NOT NULL,
  command      TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_command_log_player_time ON command_log(player_id, created_at);
