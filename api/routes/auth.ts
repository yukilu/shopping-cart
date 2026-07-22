/**
 * 认证路由：注册、登录、重置密码、获取当前用户
 */
import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, generateToken, type AuthRequest } from '../middleware/auth.js';
import type { User } from '@shared/types';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }
    if (username.length < 2 || username.length > 20) {
      res.status(400).json({ success: false, error: '用户名长度需在2-20之间' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度不能少于6位' });
      return;
    }

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(409).json({ success: false, error: '用户名已存在' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    ).run(username, passwordHash) as unknown as { lastInsertRowid: number };

    const user: User = db.prepare(
      'SELECT id, username, created_at FROM users WHERE id = ?',
    ).get(result.lastInsertRowid) as unknown as User;

    const token = generateToken(user.id);
    res.json({ success: true, data: { token, user } });
  } catch (err) {
    res.status(500).json({ success: false, error: '注册失败' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const row = db.prepare(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ?',
    ).get(username) as unknown as { id: number; username: string; password_hash: string; created_at: string } | undefined;

    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const user: User = { id: row.id, username: row.username, created_at: row.created_at };
    const token = generateToken(user.id);
    res.json({ success: true, data: { token, user } });
  } catch (err) {
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

/**
 * PUT /api/auth/password
 */
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, error: '请输入旧密码和新密码' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: '新密码长度不能少于6位' });
      return;
    }

    const row = db.prepare(
      'SELECT password_hash FROM users WHERE id = ?',
    ).get(req.userId) as { password_hash: string };

    if (!bcrypt.compareSync(oldPassword, row.password_hash)) {
      res.status(401).json({ success: false, error: '旧密码错误' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);
    res.json({ success: true, data: { success: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: '重置密码失败' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = db.prepare(
    'SELECT id, username, created_at FROM users WHERE id = ?',
  ).get(req.userId) as unknown as User | undefined;
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' });
    return;
  }
  res.json({ success: true, data: { user } });
});

export default router;
