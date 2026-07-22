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
      category: item.category_name ? { id: item.category_id, name: item.category_name } : null,
      platform: item.platform_name ? { id: item.platform_id, name: item.platform_name } : null,
      prices,
    };
  });

  res.json({ success: true, data: result });
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
    INSERT INTO items (project_id, category_id, name, purchased, price, platform_id, shop, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    input.category_id || null,
    input.name.trim(),
    input.purchased ? 1 : 0,
    input.purchased ? (input.price || null) : null,
    input.platform_id || null,
    input.shop || null,
    input.remark || null,
  ) as unknown as { lastInsertRowid: number };

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as unknown as Item;
  res.json({
    success: true,
    data: { ...item, purchased: Boolean(item.purchased), prices: [] },
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
      category_id = ?, name = ?, purchased = ?, price = ?, platform_id = ?, shop = ?, remark = ?
    WHERE id = ?
  `).run(
    input.category_id || null,
    input.name.trim(),
    input.purchased ? 1 : 0,
    input.purchased ? (input.price || null) : null,
    input.platform_id || null,
    input.shop || null,
    input.remark || null,
    itemId,
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as unknown as Item;
  res.json({
    success: true,
    data: { ...item, purchased: Boolean(item.purchased) },
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
