/**
 * 首页：年度消费统计 + 待购物品明细
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingBag, ChevronRight, Star } from 'lucide-react';
import Layout from '@/components/Layout';
import PullRefresh from '@/components/PullRefresh';
import { api } from '@/lib/api';
import type { YearStats, PendingItem } from '@shared/types';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<YearStats | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const [statsData, pendingData] = await Promise.all([
        api.getYearStats(),
        api.getPendingItems(),
      ]);
      setStats(statsData);
      setPending(pendingData);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData(true);
  };

  const currentYear = new Date().getFullYear();
  const monthMap = new Map(stats?.byMonth.map((m) => [m.month, m.total]));

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <PullRefresh onRefresh={handleRefresh}>
          <div className="px-4 pt-6 pb-20">
            {/* 年度消费统计卡片 */}
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark border-0 text-white shadow-lg shadow-primary/20 mb-6">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm opacity-90">{currentYear}年总消费</span>
                  <TrendingUp size={18} className="opacity-80" />
                </div>
                <div className="text-3xl font-bold tracking-tight">
                  ¥{loading ? '-' : (stats?.total ?? 0).toFixed(2)}
                </div>
                {/* 月度柱状图 */}
                <div className="flex items-end justify-between gap-1 mt-4 h-16">
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = String(i + 1).padStart(2, '0');
                    const total = monthMap.get(month) || 0;
                    const maxTotal = Math.max(...(stats?.byMonth.map((m) => m.total) || [1]), 1);
                    const height = total > 0 ? Math.max((total / maxTotal) * 100, 8) : 0;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end h-12">
                          <div
                            className="w-full bg-white/30 rounded-sm transition-all"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[8px] opacity-70">{i + 1}月</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 待购物品明细 */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <ShoppingBag size={18} className="text-warning" />
                待购物品
              </h2>
              {pending.length > 0 && (
                <span className="text-xs text-gray-400 bg-transparent">
                  {pending.length} 件
                </span>
              )}
            </div>

            {loading && !refreshing ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                  <ShoppingBag size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">暂无待购物品</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`查看物品：${item.name}`}
                    className="w-full rounded-xl border border-gray-100 bg-white text-left transition-all hover:border-gray-200 hover:shadow-sm active:scale-[0.99] active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                          {item.must_buy && <Star size={13} fill="currentColor" className="shrink-0 text-amber-500" />}
                          <span className="truncate">{item.name}</span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.project_name}
                          {item.category_name && ` · ${item.category_name}`}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PullRefresh>
      </div>
    </Layout>
  );
}
