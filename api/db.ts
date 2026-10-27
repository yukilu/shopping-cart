/**
 * 数据库连接与初始化，使用 node:sqlite
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件放在 server.js/ts 脚本的相同目录下
// 开发环境：api/ 目录
// 生产环境：dist-server/ 目录（与 server.js 同级）
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, 'data.db');

export const db = new DatabaseSync(dbPath);

// 启用 WAL 模式和外键支持
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * 初始化数据库表结构
 */
export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      purchased INTEGER NOT NULL DEFAULT 0,
      price REAL,
      platform_id INTEGER,
      shop TEXT,
      remark TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      must_buy INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS price_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL,
      platform_id INTEGER,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL
    );

  `);

  // 旧数据库迁移。每次启动按实际表结构检查，重复执行不会重复添加字段。
  // SQLite 不允许给包含数据的表新增带动态默认值的 NOT NULL 列，因此 date 单独补列并回填。
  db.exec('BEGIN IMMEDIATE');
  try {
    addColumnIfMissing('categories', 'sort_order', 'ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing('platforms', 'sort_order', 'ALTER TABLE platforms ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing('projects', 'date', 'ALTER TABLE projects ADD COLUMN date TEXT');
    db.exec(`
      UPDATE projects
      SET date = COALESCE(NULLIF(date, ''), substr(created_at, 1, 10), date('now'))
      WHERE date IS NULL OR date = '';
    `);
    addColumnIfMissing('items', 'sort_order', 'ALTER TABLE items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing('items', 'must_buy', 'ALTER TABLE items ADD COLUMN must_buy INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing('items', 'platform_id', 'ALTER TABLE items ADD COLUMN platform_id INTEGER');
    addColumnIfMissing('price_records', 'platform_id', 'ALTER TABLE price_records ADD COLUMN platform_id INTEGER');
    addColumnIfMissing('price_records', 'remark', 'ALTER TABLE price_records ADD COLUMN remark TEXT');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
      CREATE INDEX IF NOT EXISTS idx_platforms_user_id ON platforms(user_id);
      CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id);
      CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
      CREATE INDEX IF NOT EXISTS idx_prices_item_id ON price_records(item_id);
    `);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw new Error(`数据库结构迁移失败，已回滚本次迁移: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 安全添加列：仅当列不存在时执行 ALTER TABLE
 */
function addColumnIfMissing(table: string, column: string, ddl: string): void {
  const result = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[];
  if (!result.some((col) => col.name === column)) {
    db.exec(ddl);
  }
}
