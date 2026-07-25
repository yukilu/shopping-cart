/**
 * 统计路由
 */
import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { YearStats, PendingItem } from '@shared/types';

const router = Router();

/**
 * GET /api/stats/year
 */
router.get('/year', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const year = new Date().getFullYear();

  const totalRow = db.prepare(`
    SELECT COALESCE(SUM(i.price), 0) as total
    FROM items i
    JOIN projects p ON i.project_id = p.id
    WHERE p.user_id = ? AND i.purchased = 1 AND i.price IS NOT NULL
      AND strftime('%Y', i.created_at) = ?
  `).get(req.userId, String(year)) as unknown as { total: number };

  const monthRows = db.prepare(`
    SELECT strftime('%m', i.created_at) as month,
      COALESCE(SUM(i.price), 0) as total
    FROM items i
    JOIN projects p ON i.project_id = p.id
    WHERE p.user_id = ? AND i.purchased = 1 AND i.price IS NOT NULL
      AND strftime('%Y', i.created_at) = ?
    GROUP BY strftime('%m', i.created_at)
    ORDER BY month
  `).all(req.userId, String(year)) as { month: string; total: number }[];

  const stats: YearStats = {
    total: totalRow.total,
    byMonth: monthRows,
  };

  res.json({ success: true, data: stats });
});

/**
 * GET /api/stats/pending
 */
router.get('/pending', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const items = db.prepare(`
    SELECT i.id, i.name, i.project_id, p.name as project_name,
      c.name as category_name, i.remark, i.created_at
    FROM items i
    JOIN projects p ON i.project_id = p.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE p.user_id = ? AND i.purchased = 0
    ORDER BY i.created_at ASC
  `).all(req.userId) as unknown as PendingItem[];

  res.json({ success: true, data: items });
});

export default router;
