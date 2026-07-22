/**
 * 我的页面：用户信息卡片、分类维护、重置密码、退出登录
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, KeyRound, LogOut, Tag, UserCircle, ShoppingBag } from 'lucide-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // 重置密码
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // 退出登录
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleResetPassword = async () => {
    setPwdError('');
    if (newPwd !== confirmPwd) {
      setPwdError('两次输入的新密码不一致');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('新密码长度不能少于6位');
      return;
    }
    setPwdLoading(true);
    try {
      await api.resetPassword(oldPwd, newPwd);
      setPwdOpen(false);
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        {/* 用户信息卡片 */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark border-0 text-white shadow-lg shadow-primary/20 mb-6">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <UserCircle size={36} className="text-white/90" />
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.username || '用户'}</p>
                <p className="text-xs opacity-80 mt-0.5">
                  加入时间: {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 功能列表 */}
        <div className="bg-white rounded-xl border border-gray-100 mb-3 overflow-hidden">
          <button
            onClick={() => navigate('/categories')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag size={16} className="text-primary" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-ink">分类维护</span>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => navigate('/platforms')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag size={16} className="text-primary" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-ink">购买平台维护</span>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setPwdOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <KeyRound size={16} className="text-warning" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-ink">重置密码</span>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <LogOut size={16} className="text-red-500" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-red-500">退出登录</span>
          </button>
        </div>
      </div>

      {/* 重置密码弹窗 */}
      <Modal open={pwdOpen} title="重置密码" onClose={() => setPwdOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">旧密码</label>
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="请输入旧密码"
              className="w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">新密码</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="至少6位"
              className="w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">确认新密码</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="请再次输入新密码"
              className="w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-primary"
            />
          </div>
          {pwdError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-sm text-red-500">{pwdError}</p>
            </div>
          )}
          <button
            onClick={handleResetPassword}
            disabled={!oldPwd || !newPwd || !confirmPwd || pwdLoading}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {pwdLoading ? '重置中...' : '确认重置'}
          </button>
        </div>
      </Modal>

      {/* 退出登录确认 */}
      <ConfirmDialog
        open={logoutOpen}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmText="退出"
        cancelText="取消"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </Layout>
  );
}