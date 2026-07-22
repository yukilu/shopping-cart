/**
 * 项目明细页：物品列表、添加/编辑物品
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, TrendingUp, Trash2, Package, ChevronRight } from 'lucide-react';
import { Button, Input, TextArea, Switch } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Picker from '@/components/Picker';
import SortableList, { GripVertical } from '@/components/SortableList';
import PullRefresh from '@/components/PullRefresh';
import { api } from '@/lib/api';
import type { Item, ItemInput, Category, Platform } from '@shared/types';

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 添加/编辑物品
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemInput>({
    name: '',
    purchased: false,
    price: null,
    platform_id: null,
    shop: '',
    remark: '',
    category_id: null,
  });
  const [submitting, setSubmitting] = useState(false);

  // 删除物品
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  // Picker 状态
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const [itemsData, catsData, platformsData] = await Promise.all([
        api.getItems(projectId),
        api.getCategories(),
        api.getPlatforms(),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setPlatforms(platformsData);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData(true);
  };

  const handleReorder = async (newOrder: Item[]) => {
    setItems(newOrder);
    try {
      await api.reorderItems(projectId, newOrder.map((item) => item.id));
    } catch (err) {
      console.error('排序失败', err);
    }
  };

  const openAddForm = () => {
    setEditingItem(null);
    setForm({
      name: '',
      purchased: false,
      price: null,
      platform_id: null,
      shop: '',
      remark: '',
      category_id: null,
    });
    setFormOpen(true);
  };

  const openEditForm = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      purchased: item.purchased,
      price: item.price,
      platform_id: item.platform_id,
      shop: item.shop || '',
      remark: item.remark || '',
      category_id: item.category_id,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await api.updateItem(editingItem.id, form);
        setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
      } else {
        const newItem = await api.createItem(projectId, form);
        setItems((prev) => [newItem, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      console.error('保存物品失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteItem(deleteTarget.id);
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除物品失败', err);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="h-screen flex flex-col">
        {/* 顶部导航 */}
        <div className="sticky top-0 bg-surface z-30 px-4 pt-4 pb-2 flex items-center gap-3">
          <Button
            fill="none"
            size="small"
            onClick={() => navigate('/list')}
            className="p-1 -ml-1 text-gray-500 h-8 w-8"
          >
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-lg font-bold text-ink flex-1">项目明细</h1>
        </div>

        <PullRefresh onRefresh={handleRefresh}>
          <div className="px-4 pb-20">
            {loading && !refreshing ? (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                  <Package size={28} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 mb-1">暂无物品</p>
                <p className="text-xs text-gray-400">点击右下角加号添加物品</p>
              </div>
            ) : (
              <SortableList
                items={items}
                onReorder={handleReorder}
                getKey={(item) => item.id}
                renderItem={(item, dragHandleProps) => (
                  <div
                    className="rounded-xl border-gray-50 bg-white"
                    onClick={() => openEditForm(item)}
                  >
                    <div className="p-4 active:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          {...dragHandleProps}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-grab active:cursor-grabbing touch-none text-gray-300 flex-shrink-0 pt-1"
                        >
                          <GripVertical size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-medium text-ink">
                              {item.name}
                            </h3>
                            {item.category && (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                                {item.category.name}
                              </span>
                            )}
                          </div>
                          {item.purchased && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="font-bold text-primary text-sm">
                                ¥{Number(item.price).toFixed(2)}
                              </span>
                              {item.platform?.name && <span>{item.platform.name}</span>}
                              {item.shop && <span>· {item.shop}</span>}
                            </div>
                          )}
                        </div>
                        <div
                          className="flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={item.purchased}
                            onChange={(checked) => {
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === item.id
                                    ? { ...it, purchased: checked, price: checked ? (it.price || 0) : null }
                                    : it
                                )
                              );
                              api.updateItem(item.id, {
                                ...item,
                                purchased: checked,
                                price: checked ? (item.price || 0) : null,
                              });
                            }}
                          />
                        </div>
                      </div>

                      {item.remark && (
                        <p className="text-xs text-gray-400 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
                          {item.remark}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        {/* 价格范围 */}
                        {(() => {
                          const prices = item.prices || [];
                          if (prices.length === 0) return null;
                          const minPrice = Math.min(...prices.map(p => p.price));
                          const maxPrice = Math.max(...prices.map(p => p.price));
                          return (
                            <span className="text-xs text-gray-400">
                              ¥{minPrice.toFixed(2)} ~ ¥{maxPrice.toFixed(2)}
                            </span>
                          );
                        })()}
                        {/* 操作图标 */}
                        <div className="flex items-center gap-4 ml-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/price-history/${item.id}?name=${encodeURIComponent(item.name)}`);
                            }}
                            className="text-gray-400 p-1 active:text-primary"
                          >
                            <TrendingUp size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            className="text-gray-400 p-1 active:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </PullRefresh>
      </div>

      {/* 悬浮添加按钮 */}
      <Button
        fill="none"
        onClick={openAddForm}
        size="small"
        className="fixed bottom-6 right-4 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-90 transition-transform z-30"
      >
        <Plus size={20} />
      </Button>

      {/* 添加/编辑物品弹窗 */}
      <Modal
        open={formOpen}
        title={editingItem ? '编辑物品' : '添加物品'}
        onClose={() => setFormOpen(false)}
      >
        <div className="space-y-0">
          {/* 物品名称 */}
          <div className="flex items-center gap-3 py-3 border-b border-gray-50">
            <label className="text-sm text-gray-500 w-20 shrink-0">物品名称</label>
            <Input
              type="text"
              value={form.name}
              onChange={(val) => setForm({ ...form, name: val })}
              placeholder="请输入"
              className="flex-1 h-10 rounded-lg border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 text-sm"
            />
          </div>

          {/* 分类 */}
          <div
            className="flex items-center justify-between py-3 border-b border-gray-50 cursor-pointer active:bg-gray-50"
            onClick={() => setCatPickerOpen(true)}
          >
            <label className="text-sm text-gray-500">分类</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-ink">
                {form.category_id ? categories.find((c) => c.id === form.category_id)?.name || '未分类' : '未分类'}
              </span>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>

          {/* 已购 */}
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <label className="text-sm text-gray-500">已购</label>
            <Switch
              checked={form.purchased}
              onChange={(checked) => setForm({ ...form, purchased: checked })}
            />
          </div>

          {form.purchased && (
            <>
              {/* 购买价格 */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-50">
                <label className="text-sm text-gray-500 w-20 shrink-0">购买价格</label>
                <Input
                  type="number"
                  value={String(form.price ?? '')}
                  onChange={(val) => setForm({ ...form, price: val ? Number(val) : null })}
                  placeholder="0.00"
                  className="flex-1 h-10 rounded-lg border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 text-sm"
                />
              </div>
              {/* 购买平台 */}
              <div
                className="flex items-center justify-between py-3 border-b border-gray-50 cursor-pointer active:bg-gray-50"
                onClick={() => setPlatformPickerOpen(true)}
              >
                <label className="text-sm text-gray-500">购买平台</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-ink">
                    {form.platform_id ? platforms.find((p) => p.id === form.platform_id)?.name || '未选择' : '未选择'}
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
              {/* 购买店铺 */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-50">
                <label className="text-sm text-gray-500 w-20 shrink-0">购买店铺</label>
                <Input
                  type="text"
                  value={form.shop || ''}
                  onChange={(val) => setForm({ ...form, shop: val })}
                  placeholder="店铺名称"
                  className="flex-1 h-10 rounded-lg border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 text-sm"
                />
              </div>
            </>
          )}

          {/* 备注 */}
          <div className="flex items-start gap-3 py-3 border-b border-gray-50">
            <label className="text-sm text-gray-500 w-20 shrink-0 pt-2">备注</label>
            <TextArea
              value={form.remark || ''}
              onChange={(val) => setForm({ ...form, remark: val })}
              placeholder="添加备注..."
              rows={2}
              className="flex-1 rounded-lg border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 text-sm resize-none min-h-[60px]"
            />
          </div>

          <Button
            fill="none"
            onClick={handleSubmit}
            disabled={!form.name.trim() || submitting}
            className="w-full h-12 mt-4 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </Modal>

      {/* 删除物品确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除物品"
        message={`确定删除"${deleteTarget?.name}"吗？`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 分类 Picker */}
      <Picker
        open={catPickerOpen}
        title="选择分类"
        options={[{ label: '未分类', value: '' }, ...categories.map((c) => ({ label: c.name, value: c.id }))]}
        value={form.category_id || ''}
        onChange={(v) => setForm({ ...form, category_id: v === '' ? null : Number(v) })}
        onClose={() => setCatPickerOpen(false)}
      />

      {/* 平台 Picker */}
      <Picker
        open={platformPickerOpen}
        title="选择平台"
        options={[{ label: '未选择', value: '' }, ...platforms.map((p) => ({ label: p.name, value: p.id }))]}
        value={form.platform_id || ''}
        onChange={(v) => setForm({ ...form, platform_id: v === '' ? null : Number(v) })}
        onClose={() => setPlatformPickerOpen(false)}
      />
    </Layout>
  );
}