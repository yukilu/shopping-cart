/**
 * 价格走势路由
 */
import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { PriceRecord, PriceInput } from '@shared/types';

const router = Router();

/**
 * 验证物品归属当前用户
 */
function verifyItem(itemId: number, userId: number): boolean {
  const row = db.prepare(`
    SELECT i.id FROM items i
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = ? AND p.user_id = ?
  `).get(itemId, userId);
  return !!row;
}

/**
 * GET /api/prices/item/:itemId
 */
router.get('/item/:itemId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.itemId);
  if (!verifyItem(itemId, req.userId!)) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  const prices = db.prepare(`
    SELECT pr.*, p.name as platform_name
    FROM price_records pr
    LEFT JOIN platforms p ON pr.platform_id = p.id
    WHERE pr.item_id = ?
    ORDER BY date DESC, created_at DESC
  `).all(itemId) as unknown as (PriceRecord & { platform_name: string | null })[];

  res.json({ success: true, data: prices });
});

/**
 * POST /api/prices/item/:itemId
 */
router.post('/item/:itemId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const itemId = Number(req.params.itemId);
  if (!verifyItem(itemId, req.userId!)) {
    res.status(404).json({ success: false, error: '物品不存在' });
    return;
  }

  const input: PriceInput = req.body;
  if (input.price === undefined || input.price === null || input.price < 0) {
    res.status(400).json({ success: false, error: '请输入有效价格' });
    return;
  }
  if (!input.date) {
    res.status(400).json({ success: false, error: '请选择日期' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO price_records (item_id, price, date, platform_id, remark) VALUES (?, ?, ?, ?, ?)',
  ).run(itemId, input.price, input.date, input.platform_id || null, input.remark || null) as unknown as { lastInsertRowid: number };

  const price = db.prepare(`
    SELECT pr.*, p.name as platform_name
    FROM price_records pr
    LEFT JOIN platforms p ON pr.platform_id = p.id
    WHERE pr.id = ?
  `).get(result.lastInsertRowid) as unknown as PriceRecord;

  res.json({ success: true, data: price });
});

/**
 * PUT /api/prices/:id
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const priceId = Number(req.params.id);
  const input: PriceInput = req.body;

  const price = db.prepare(`
    SELECT pr.id FROM price_records pr
    JOIN items i ON pr.item_id = i.id
    JOIN projects p ON i.project_id = p.id
    WHERE pr.id = ? AND p.user_id = ?
  `).get(priceId, req.userId) as unknown as { id: number } | undefined;

  if (!price) {
    res.status(404).json({ success: false, error: '价格记录不存在' });
    return;
  }

  db.prepare(
    'UPDATE price_records SET price = ?, date = ?, platform_id = ?, remark = ? WHERE id = ?',
  ).run(input.price, input.date, input.platform_id || null, input.remark || null, priceId);

  const updated = db.prepare(`
    SELECT pr.*, p.name as platform_name
    FROM price_records pr
    LEFT JOIN platforms p ON pr.platform_id = p.id
    WHERE pr.id = ?
  `).get(priceId) as unknown as PriceRecord;

  res.json({ success: true, data: updated });
});

/**
 * DELETE /api/prices/:id
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const priceId = Number(req.params.id);
  const price = db.prepare(`
    SELECT pr.id FROM price_records pr
    JOIN items i ON pr.item_id = i.id
    JOIN projects p ON i.project_id = p.id
    WHERE pr.id = ? AND p.user_id = ?
  `).get(priceId, req.userId) as unknown as { id: number } | undefined;

  if (!price) {
    res.status(404).json({ success: false, error: '价格记录不存在' });
    return;
  }

  db.prepare('DELETE FROM price_records WHERE id = ?').run(priceId);
  res.json({ success: true, data: { success: true } });
});

export default router;
