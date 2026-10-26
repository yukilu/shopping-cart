/**
 * 注册页面
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button, Input } from '@nutui/nutui-react';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
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
        <h1 className="text-2xl font-bold text-ink">创建账号</h1>
        <p className="text-sm text-gray-500 mt-1">开始记录你的购物清单</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-600">用户名</label>
          <Input
            type="text"
            value={username}
            onChange={(val) => setUsername(val)}
            placeholder="2-20个字符"
            className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-600">密码</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(val) => setPassword(val)}
              placeholder="至少6位"
              className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 pr-12 focus-visible:ring-primary/10 focus-visible:border-primary"
            />
            <Button
              type="default"
              fill="none"
              size="small"
              nativeType="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 h-8 w-8"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-600">确认密码</label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(val) => setConfirmPassword(val)}
            placeholder="请再次输入密码"
            className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <Button
          type="primary"
          nativeType="submit"
          disabled={loading || !username || !password || !confirmPassword}
          className="w-full h-12 rounded-xl bg-primary text-white font-medium text-base shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? '注册中...' : '注册'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        已有账号？{' '}
        <button type="button" onClick={() => navigate(-1)} className="text-primary font-medium">
          返回登录
        </button>
      </p>
    </div>
  );
}
