-- Wave C: Food log (macros), goals + actions (probability engine), mana state.

CREATE TABLE food_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calories_per_serving REAL NOT NULL,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'serving',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX food_items_user_name_idx ON food_items (user_id, name);

CREATE TABLE food_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  food_item_id TEXT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  servings REAL NOT NULL DEFAULT 1,
  meal_type TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX food_logs_user_date_idx ON food_logs (user_id, date);

CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  target_date TEXT,
  target_value_num REAL,
  target_value_text TEXT,
  probability REAL NOT NULL DEFAULT 50,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX goals_user_idx ON goals (user_id);

CREATE TABLE goal_actions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  action_at TEXT NOT NULL,
  delta REAL NOT NULL DEFAULT 0,
  source TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX goal_actions_goal_idx ON goal_actions (goal_id, action_at);

CREATE TABLE mana_state (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  daily_max INTEGER NOT NULL DEFAULT 10,
  bank_remaining INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX mana_state_user_date_idx ON mana_state (user_id, date);
