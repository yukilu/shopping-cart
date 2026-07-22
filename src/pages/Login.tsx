/**
 * 登录页面 - 表单水平布局
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-surface">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/30">
          <ShoppingCart size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-ink">购物清单</h1>
        <p className="text-sm text-gray-500 mt-1">记录每一笔消费，掌握每一份价格</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 用户名 - 水平布局 */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 h-12">
          <label className="text-sm font-medium text-gray-500 w-16 shrink-0">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入"
            className="flex-1 h-full text-sm text-ink placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* 密码 - 水平布局 */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 h-12">
          <label className="text-sm font-medium text-gray-500 w-16 shrink-0">密码</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入"
            className="flex-1 h-full text-sm text-ink placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 p-1"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full h-12 rounded-xl bg-primary text-white font-medium text-base shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        还没有账号？{' '}
        <Link to="/register" className="text-primary font-medium">
          立即注册
        </Link>
      </p>
    </div>
  );
}