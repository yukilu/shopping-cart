/**
 * 价格走势页面：添加/编辑/删除价格记录
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Plus, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DatePicker from '@/components/DatePicker';
import Picker from '@/components/Picker';
import PullRefresh from '@/components/PullRefresh';
import { api } from '@/lib/api';
import type { PriceRecord, PriceInput, Platform } from '@shared/types';

export default function PriceHistory() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const itemName = searchParams.get('name') || '物品';

  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 添加/编辑价格记录
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceRecord | null>(null);
  const [form, setForm] = useState<PriceInput>({
    price: 0,
    date: new Date().toISOString().split('T')[0],
    platform_id: null,
    remark: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 删除价格记录
  const [deleteTarget, setDeleteTarget] = useState<PriceRecord | null>(null);

  // 日期选择器
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // 平台选择器
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!itemId) return;
    if (!isRefresh) {
      setLoading(true);
    }
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const [pricesData, platformsData] = await Promise.all([
        api.getPrices(Number(itemId)),
        api.getPlatforms(),
      ]);
      setPrices(pricesData);
      setPlatforms(platformsData);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData(true);
  };

  const openAddForm = () => {
    setEditingPrice(null);
    setForm({
      price: 0,
      date: new Date().toISOString().split('T')[0],
      platform_id: null,
      remark: '',
    });
    setFormOpen(true);
  };

  const openEditForm = (price: PriceRecord) => {
    setEditingPrice(price);
    setForm({
      price: price.price,
      date: price.date,
      platform_id: price.platform_id,
      remark: price.remark || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!itemId || form.price <= 0 || !form.date) return;
    setSubmitting(true);
    try {
      if (editingPrice) {
        const updated = await api.updatePrice(editingPrice.id, form);
        setPrices((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const newPrice = await api.createPrice(Number(itemId), form);
        setPrices((prev) => [newPrice, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      console.error('保存价格记录失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePrice(deleteTarget.id);
      setPrices((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除价格记录失败', err);
    }
  };

  // 计算涨跌
  const getPriceTrend = (idx: number) => {
    const price = prices[idx];
    const prevPrice = prices[idx + 1];
    if (!prevPrice) return null;
    const diff = price.price - prevPrice.price;
    return diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  };

  return (
    <Layout showNav={false}>
      <div className="h-screen flex flex-col">
        {/* 顶部导航 */}
        <div className="sticky top-0 bg-surface z-30 px-4 pt-4 pb-2 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-gray-500"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-ink flex-1">价格走势</h1>
          <span className="text-sm text-gray-400">{itemName}</span>
        </div>

        <PullRefresh onRefresh={handleRefresh}>
          <div className="px-4 pb-20">
            {loading && !refreshing ? (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : prices.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                  <TrendingUp size={28} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 mb-1">暂无价格记录</p>
                <p className="text-xs text-gray-400">点击右下角加号添加</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prices.map((price, idx) => {
                  const trend = getPriceTrend(idx);
                  const prevPrice = prices[idx + 1];
                  const diff = prevPrice ? price.price - prevPrice.price : 0;
                  return (
                    <div
                      key={price.id}
                      className="bg-white rounded-xl border border-gray-100 p-4 active:bg-gray-50 cursor-pointer"
                      onClick={() => openEditForm(price)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-ink">
                              ¥{price.price.toFixed(2)}
                            </span>
                            {trend && (
                              <span
                                className={`text-xs ${
                                  trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-success' : 'text-gray-400'
                                }`}
                              >
                                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '-'}
                                {trend !== 'flat' && `¥${Math.abs(diff).toFixed(2)}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>{price.date}</span>
                            {price.platform_name && (
                              <span>· {price.platform_name}</span>
                            )}
                          </div>
                          {price.remark && (
                            <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded px-2 py-1">
                              {price.remark}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(price);
                          }}
                          className="p-2 text-gray-300 active:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PullRefresh>
      </div>

      {/* 悬浮添加按钮 */}
      <button
        onClick={openAddForm}
        className="fixed bottom-6 right-4 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-90 transition-transform z-30 flex items-center justify-center"
      >
        <Plus size={20} />
      </button>

      {/* 添加/编辑价格弹窗 */}
      <Modal
        open={formOpen}
        title={editingPrice ? '编辑价格' : '添加价格'}
        onClose={() => setFormOpen(false)}
      >
        <div className="space-y-4">
          {/* 价格 */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-12 shrink-0">价格</label>
            <input
              type="number"
              value={String(form.price || '')}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="0.00"
              className="flex-1 h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* 日期 */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-12 shrink-0">日期</label>
            <div
              className="flex-1 h-12 rounded-xl border border-gray-200 bg-white px-4 flex items-center cursor-pointer"
              onClick={() => setDatePickerOpen(true)}
            >
              <span className={form.date ? 'text-sm text-ink' : 'text-sm text-gray-400'}>
                {form.date || '选择日期'}
              </span>
            </div>
          </div>

          {/* 平台 */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-12 shrink-0">平台</label>
            <div
              className="flex-1 h-12 rounded-xl border border-gray-200 bg-white px-4 flex items-center justify-between cursor-pointer"
              onClick={() => setPlatformPickerOpen(true)}
            >
              <span className={form.platform_id ? 'text-sm text-ink' : 'text-sm text-gray-400'}>
                {form.platform_id
                  ? platforms.find((p) => p.id === form.platform_id)?.name || '未选择'
                  : '未选择'}
              </span>
              <span className="text-gray-300 text-xs">▼</span>
            </div>
          </div>

          {/* 备注 */}
          <div className="flex items-start gap-3">
            <label className="text-sm text-gray-500 w-12 shrink-0 pt-3">备注</label>
            <textarea
              value={form.remark || ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder="添加备注..."
              rows={2}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={form.price <= 0 || !form.date || submitting}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除价格记录"
        message="确定删除这条价格记录吗？"
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 日期选择器 */}
      <DatePicker
        open={datePickerOpen}
        value={form.date}
        onChange={(d) => setForm({ ...form, date: d })}
        onClose={() => setDatePickerOpen(false)}
      />

      {/* 平台选择器 */}
      <Picker
        open={platformPickerOpen}
        title="选择平台"
        options={[
          { label: '未选择', value: '' },
          ...platforms.map((p) => ({ label: p.name, value: p.id })),
        ]}
        value={form.platform_id || ''}
        onChange={(v) => setForm({ ...form, platform_id: v === '' ? null : Number(v) })}
        onClose={() => setPlatformPickerOpen(false)}
      />
    </Layout>
  );
}