/**
 * 购买平台路由
 */
import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { Platform } from '@shared/types';

const router = Router();

/**
 * GET /api/platforms
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const platforms = db.prepare(
    'SELECT * FROM platforms WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC',
  ).all(req.userId) as unknown as Platform[];

  res.json({ success: true, data: platforms });
});

/**
 * POST /api/platforms
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: '平台名称不能为空' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO platforms (user_id, name) VALUES (?, ?)',
  ).run(req.userId, name.trim()) as unknown as { lastInsertRowid: number };

  const platform = db.prepare(
    'SELECT * FROM platforms WHERE id = ?',
  ).get(result.lastInsertRowid) as unknown as Platform;

  res.json({ success: true, data: platform });
});

/**
 * PUT /api/platforms/reorder
 */
router.put('/reorder', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { order } = req.body as { order: number[] };
  if (!Array.isArray(order)) {
    res.status(400).json({ success: false, error: '参数无效' });
    return;
  }

  const stmt = db.prepare('UPDATE platforms SET sort_order = ? WHERE id = ? AND user_id = ?');
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
 * PUT /api/platforms/:id
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: '平台名称不能为空' });
    return;
  }

  const platform = db.prepare(
    'SELECT * FROM platforms WHERE id = ? AND user_id = ?',
  ).get(Number(req.params.id), req.userId) as unknown as Platform | undefined;

  if (!platform) {
    res.status(404).json({ success: false, error: '平台不存在' });
    return;
  }

  db.prepare('UPDATE platforms SET name = ? WHERE id = ?').run(name.trim(), Number(req.params.id));
  const updated = db.prepare('SELECT * FROM platforms WHERE id = ?').get(Number(req.params.id)) as unknown as Platform;
  res.json({ success: true, data: updated });
});

/**
 * DELETE /api/platforms/:id
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const platform = db.prepare(
    'SELECT * FROM platforms WHERE id = ? AND user_id = ?',
  ).get(Number(req.params.id), req.userId) as unknown as Platform | undefined;

  if (!platform) {
    res.status(404).json({ success: false, error: '平台不存在' });
    return;
  }

  db.prepare('DELETE FROM platforms WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, data: { success: true } });
});

export default router;
