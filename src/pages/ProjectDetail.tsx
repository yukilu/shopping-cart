/**
 * 项目物品列表页
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, Package, Check, Circle, Star } from 'lucide-react';
import { Button, Input, TextArea } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ReorderableList from '@/components/ReorderableList';
import PullRefresh from '@/components/PullRefresh';
import PurchaseDetailsDialog, { type PurchaseDetails } from '@/components/PurchaseDetailsDialog';
import { api } from '@/lib/api';
import type { Item, ItemInput, Category, Platform, Project } from '@shared/types';

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 添加物品
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemInput>({
    name: '',
    purchased: false,
    must_buy: false,
    price: null,
    platform_id: null,
    shop: '',
    remark: '',
    category_id: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<Item | null>(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseForm, setPurchaseForm] = useState<PurchaseDetails>({ price: '', platform_id: null, shop: '' });

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const [projectData, itemsData, catsData, platformsData] = await Promise.all([
        api.getProject(projectId),
        api.getItems(projectId),
        api.getCategories(),
        api.getPlatforms(),
      ]);
      setProject(projectData);
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

  const toggleMustBuy = async (item: Item) => {
    const must_buy = !item.must_buy;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, must_buy } : entry));
    try {
      await api.updateItem(item.id, {
        name: item.name,
        purchased: item.purchased,
        must_buy,
        price: item.price,
        platform_id: item.platform_id,
        shop: item.shop || '',
        remark: item.remark || '',
        category_id: item.category_id,
      });
    } catch (err) {
      console.error('更新必购状态失败', err);
      await loadData(true);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseTarget) return;
    const price = Number(purchaseForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      setPurchaseError('请输入有效的购买价格');
      return;
    }

    setSubmitting(true);
    setPurchaseError('');
    try {
      await api.completeItemPurchase(purchaseTarget.id, {
        price,
        platform_id: purchaseForm.platform_id,
        shop: purchaseForm.shop,
      });
      setPurchaseTarget(null);
      await loadData(true);
    } catch (err) {
      console.error('保存购买信息失败', err);
      setPurchaseError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddForm = () => {
    setForm({
      name: '',
      purchased: false,
      must_buy: false,
      price: null,
      platform_id: null,
      shop: '',
      remark: '',
      category_id: null,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const newItem = await api.createItem(projectId, form);
      setItems((prev) => [newItem, ...prev]);
      setFormOpen(false);
    } catch (err) {
      console.error('保存物品失败', err);
    } finally {
      setSubmitting(false);
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
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-gray-500 h-8 w-8"
          >
            <ChevronLeft size={24} />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">
            {project?.name || '物品清单'}
          </h1>
        </div>

        <PullRefresh onRefresh={handleRefresh}>
          <div className="px-4 pt-4 pb-20">
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
              <ReorderableList
                items={items}
                onReorder={handleReorder}
                getKey={(item) => item.id}
                getLabel={(item) => item.name}
                renderItem={(item) => (
                  <div
                    className="cursor-pointer rounded-xl border-gray-50 bg-white"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="p-4 active:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
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
                            <button
                              type="button"
                              aria-pressed={item.must_buy}
                              aria-label={item.must_buy ? '取消必购' : '标记为必购'}
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleMustBuy(item);
                              }}
                              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                                item.must_buy
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'text-gray-300 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <Star size={16} fill={item.must_buy ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                          {item.purchased && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              {item.price !== null && (
                                <span className="font-bold text-primary text-sm">
                                  ¥{Number(item.price).toFixed(2)}
                                </span>
                              )}
                              {item.platform?.name && <span>{item.platform.name}</span>}
                              {item.shop && <span>· {item.shop}</span>}
                            </div>
                          )}
                        </div>
                        {item.purchased ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <Check size={14} />已购
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPurchaseForm({ price: '', platform_id: item.platform_id, shop: item.shop || '' });
                              setPurchaseError('');
                              setPurchaseTarget(item);
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200"
                          >
                            <Circle size={14} />待购
                          </button>
                        )}
                      </div>

                      {item.remark && (
                        <p className="text-xs text-gray-400 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
                          {item.remark}
                        </p>
                      )}

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
        title="添加物品"
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
          <div className="border-b border-gray-50 py-3">
            <span className="text-sm text-gray-500">分类（选填）</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = form.category_id === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setForm({ ...form, category_id: selected ? null : category.id })}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 购买状态 */}
          <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50">
            <label className="text-sm text-gray-500">购买状态</label>
            <div className="flex rounded-lg bg-gray-100 p-1" role="group" aria-label="购买状态">
              <button
                type="button"
                aria-pressed={!form.purchased}
                onClick={() => setForm({ ...form, purchased: false })}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  !form.purchased ? 'bg-white font-medium text-ink shadow-sm' : 'text-gray-500'
                }`}
              >
                待购
              </button>
              <button
                type="button"
                aria-pressed={form.purchased}
                onClick={() => setForm({ ...form, purchased: true })}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  form.purchased ? 'bg-white font-medium text-ink shadow-sm' : 'text-gray-500'
                }`}
              >
                已购
              </button>
            </div>
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
              <div className="border-b border-gray-50 py-3">
                <span className="text-sm text-gray-500">购买平台（选填）</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {platforms.map((platform) => {
                    const selected = form.platform_id === platform.id;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setForm({ ...form, platform_id: selected ? null : platform.id })}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          selected ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        {platform.name}
                      </button>
                    );
                  })}
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

          <div className="flex items-start gap-3 border-b border-gray-50 py-3">
            <label className="w-20 shrink-0 pt-2 text-sm text-gray-500">备注</label>
            <TextArea
              value={form.remark || ''}
              onChange={(value) => setForm({ ...form, remark: value })}
              placeholder="添加备注..."
              rows={2}
              className="min-h-[60px] flex-1 resize-none rounded-lg border-gray-200 bg-white text-sm text-ink"
            />
          </div>

          <button
            type="button"
            aria-pressed={!!form.must_buy}
            onClick={() => setForm({ ...form, must_buy: !form.must_buy })}
            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
              form.must_buy
                ? 'border-amber-200 bg-amber-50 font-medium text-amber-700'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            <Star size={16} fill={form.must_buy ? 'currentColor' : 'none'} />必购
          </button>

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

      <PurchaseDetailsDialog
        open={!!purchaseTarget}
        itemName={purchaseTarget?.name || '物品'}
        platforms={platforms}
        value={purchaseForm}
        error={purchaseError}
        submitting={submitting}
        onChange={setPurchaseForm}
        onConfirm={handleConfirmPurchase}
        onClose={() => setPurchaseTarget(null)}
      />

    </Layout>
  );
}
