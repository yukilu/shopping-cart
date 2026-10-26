/**
 * 物品明细路由
 */
import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { Item, ItemInput, PriceRecord } from '@shared/types';

const router = Router();

/**
 * 验证项目归属当前用户
 */
function verifyProject(projectId: number, userId: number): boolean {
  const row = db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
  ).get(projectId, userId);
  return !!row;
}

/**
 * 验证物品归属当前用户
 */
function verifyItem(itemId: number, userId: number): Item | null {
  const item = db.prepare(`
    SELECT i.* FROM items i
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = ? AND p.user_id = ?
  `).get(itemId, userId) as unknown as Item | undefined;
  return item || null;
}

/**
 * GET /api/projects/:projectId/items
 */
router.get('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!verifyProject(projectId, req.userId!)) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }

  const items = db.prepare(`
    SELECT i.*, c.name as category_name, p.name as platform_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN platforms p ON i.platform_id = p.id
    WHERE i.project_id = ?
    ORDER BY i.sort_order ASC, i.created_at DESC
  `).all(projectId) as unknown as (Item & { category_name: string | null; platform_name: string | null })[];

  // 获取每个物品的价格走势
  const result = items.map((item) => {
    const prices = db.prepare(`
      SELECT pr.*, p.name as platform_name
      FROM price_records pr
      LEFT JOIN platforms p ON pr.platform_id = p.id
      WHERE pr.item_id = ?
      ORDER BY date DESC
    `).all(item.id) as unknown as (PriceRecord & { platform_name: string | null })[];
    return {
      ...item,
      purchased: Boolean(item.purchased),
      must_buy: Boolean(item.must_buy),
      category: item.category_name ? { id: item.category_id, name: item.category_name } : null,
      platform: item.platform_name ? { id: item.platform_id, name: item.platform_name } : null,
      prices,
    };
  });

  res.json({ success: true, data: result });
});

/**
 * GET /api/items/:id
 */
router.get('/items/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const item = db.prepare(`
    SELECT i.*, c.name AS category_name, p.name AS platform_name
    FROM items i
    JOIN projects project ON project.id = i.project_id
    LEFT JOIN categories c ON c.id = i.category_id
    LEFT JOIN platforms p ON p.id = i.platform_id
    WHERE i.id = ? AND project.user_id = ?
  `).get(Number(req.params.id), req.userId) as unknown as (Item & {
    category_name: string | null;
    platform_name: string | null;
  }) | undefined;

  if (!item) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  const prices = db.prepare(`
    SELECT price_records.*, platforms.name AS platform_name
    FROM price_records
    LEFT JOIN platforms ON platforms.id = price_records.platform_id
    WHERE price_records.item_id = ?
    ORDER BY date DESC
  `).all(item.id) as unknown as PriceRecord[];

  res.json({
    success: true,
    data: {
      ...item,
      purchased: Boolean(item.purchased),
      must_buy: Boolean(item.must_buy),
      category: item.category_name ? { id: item.category_id, name: item.category_name } : null,
      platform: item.platform_name ? { id: item.platform_id, name: item.platform_name } : null,
      prices,
    },
  });
});

/**
 * POST /api/projects/:projectId/items
 */
router.post('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!verifyProject(projectId, req.userId!)) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }

  const input: ItemInput = req.body;
  if (!input.name || !input.name.trim()) {
    res.status(400).json({ success: false, error: '物品名称不能为空' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO items (project_id, category_id, name, purchased, must_buy, price, platform_id, shop, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    input.category_id || null,
    input.name.trim(),
    input.purchased ? 1 : 0,
    input.must_buy ? 1 : 0,
    input.purchased ? (input.price || null) : null,
    input.platform_id || null,
    input.shop || null,
    input.remark || null,
  ) as unknown as { lastInsertRowid: number };

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as unknown as Item;
  res.json({
    success: true,
    data: { ...item, purchased: Boolean(item.purchased), must_buy: Boolean(item.must_buy), prices: [] },
  });
});

/**
 * PUT /api/items/reorder
 */
router.put('/reorder', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { order } = req.body as { order: number[] };
  if (!Array.isArray(order)) {
    res.status(400).json({ success: false, error: '参数无效' });
    return;
  }

  const stmt = db.prepare(`
    UPDATE items SET sort_order = ?
    WHERE id = ? AND id IN (
      SELECT i.id FROM items i
      JOIN projects p ON i.project_id = p.id
      WHERE p.user_id = ?
    )
  `);
  db.exec('BEGIN');
  try {
    for (let i = 0; i < order.length; i++) {
      stmt.run(i, order[i], req.userId);
    }
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
  }

  res.json({ success: true, data: { success: true } });
});

/**
 * PUT /api/items/:id/move
 */
router.put('/items/:id/move', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  const item = verifyItem(itemId, req.userId!);
  if (!item) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }
  if (item.purchased) {
    res.status(400).json({ success: false, error: '已购买的物品不能更换清单' });
    return;
  }

  const projectId = Number(req.body.projectId);
  if (!Number.isInteger(projectId) || !verifyProject(projectId, req.userId!)) {
    res.status(404).json({ success: false, error: '目标清单不存在' });
    return;
  }

  const nextSortOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM items WHERE project_id = ?',
  ).get(projectId) as { next: number };

  db.prepare('UPDATE items SET project_id = ?, sort_order = ? WHERE id = ?')
    .run(projectId, nextSortOrder.next, itemId);

  res.json({ success: true, data: { success: true } });
});

/**
 * PUT /api/items/:id/purchase
 */
router.put('/items/:id/purchase', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  const item = verifyItem(itemId, req.userId!);
  if (!item) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  const price = Number(req.body.price);
  const platformId = req.body.platform_id ? Number(req.body.platform_id) : null;
  const shop = typeof req.body.shop === 'string' ? req.body.shop.trim() : '';
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ success: false, error: '请输入有效的购买价格' });
    return;
  }
  if (platformId !== null) {
    const platform = db.prepare('SELECT id FROM platforms WHERE id = ? AND user_id = ?')
      .get(platformId, req.userId);
    if (!platform) {
      res.status(400).json({ success: false, error: '购买平台无效' });
      return;
    }
  }

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE items SET purchased = 1, price = ?, platform_id = ?, shop = ? WHERE id = ?')
      .run(price, platformId, shop || null, itemId);
    if (!item.purchased) {
      db.prepare(`
        INSERT INTO price_records (item_id, price, date, platform_id, remark)
        VALUES (?, ?, ?, ?, ?)
      `).run(itemId, price, new Date().toISOString().split('T')[0], platformId, '购买价');
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('保存购买信息失败', err);
    res.status(500).json({ success: false, error: '保存购买信息失败' });
    return;
  }

  res.json({ success: true, data: { success: true } });
});

/**
 * PUT /api/items/:id
 */
router.put('/items/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  const existing = verifyItem(itemId, req.userId!);
  if (!existing) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  const input: ItemInput = req.body;
  if (!input.name || !input.name.trim()) {
    res.status(400).json({ success: false, error: '物品名称不能为空' });
    return;
  }

  db.prepare(`
    UPDATE items SET
      category_id = ?, name = ?, purchased = ?, must_buy = ?, price = ?, platform_id = ?, shop = ?, remark = ?
    WHERE id = ?
  `).run(
    input.category_id || null,
    input.name.trim(),
    input.purchased ? 1 : 0,
    input.must_buy ? 1 : 0,
    input.purchased ? (input.price || null) : null,
    input.platform_id || null,
    input.shop || null,
    input.remark || null,
    itemId,
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as unknown as Item;
  res.json({
    success: true,
    data: { ...item, purchased: Boolean(item.purchased), must_buy: Boolean(item.must_buy) },
  });
});

/**
 * DELETE /api/items/:id
 */
router.delete('/items/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.id);
  const existing = verifyItem(itemId, req.userId!);
  if (!existing) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
  res.json({ success: true, data: { success: true } });
});

export default router;
