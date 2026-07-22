/**
 * 项目路由
 */
import { Router, type Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { Project } from '@shared/types';

const router = Router();
const PAGE_SIZE = 20;

/**
 * GET /api/projects
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  
  // 查询总数
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM projects WHERE user_id = ?
  `).get(req.userId) as unknown as { total: number };
  
  const total = countResult.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  const projects = db.prepare(`
    SELECT p.*,
      COUNT(i.id) as item_count,
      COALESCE(SUM(CASE WHEN i.purchased = 1 AND i.price IS NOT NULL THEN i.price ELSE 0 END), 0) as total_spent
    FROM projects p
    LEFT JOIN items i ON i.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.date DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.userId, PAGE_SIZE, offset) as unknown as Project[];

  res.json({ 
    success: true, 
    data: projects,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages
    }
  });
});

/**
 * POST /api/projects
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, date } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: '项目名称不能为空' });
    return;
  }

  const projectDate = date || new Date().toISOString().split('T')[0];

  const result = db.prepare(
    'INSERT INTO projects (user_id, name, date) VALUES (?, ?, ?)',
  ).run(req.userId, name.trim(), projectDate) as unknown as { lastInsertRowid: number };

  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ?',
  ).get(result.lastInsertRowid) as unknown as Project;

  res.json({ success: true, data: project });
});

/**
 * PUT /api/projects/:id
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, date } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: '项目名称不能为空' });
    return;
  }

  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
  ).get(Number(req.params.id), req.userId) as unknown as Project | undefined;

  if (!project) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }

  db.prepare('UPDATE projects SET name = ?, date = ? WHERE id = ?').run(name.trim(), date || project.date, Number(req.params.id));
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(req.params.id)) as unknown as Project;
  res.json({ success: true, data: updated });
});

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
  ).get(Number(req.params.id), req.userId) as unknown as Project | undefined;

  if (!project) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, data: { success: true } });
});

export default router;
