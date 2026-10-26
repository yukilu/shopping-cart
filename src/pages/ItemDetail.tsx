/**
 * 物品详情页：查看、编辑、删除物品并查看价格走势
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pencil,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Button, Input, TextArea } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';
import PurchaseDetailsDialog, { type PurchaseDetails } from '@/components/PurchaseDetailsDialog';
import { api } from '@/lib/api';
import type { Category, Item, ItemInput, Platform, PriceRecord, Project } from '@shared/types';

const emptyForm: ItemInput = {
  name: '',
  purchased: false,
  must_buy: false,
  price: null,
  platform_id: null,
  shop: '',
  remark: '',
  category_id: null,
};

function PriceLineChart({ prices }: { prices: PriceRecord[] }) {
  if (prices.length === 0) {
    return <p className="py-5 text-center text-sm text-gray-400">暂无价格记录</p>;
  }

  const orderedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const rawMin = Math.min(...orderedPrices.map((price) => price.price));
  const rawMax = Math.max(...orderedPrices.map((price) => price.price));
  const spread = rawMax - rawMin || Math.max(rawMax * 0.1, 1);
  const min = Math.max(0, rawMin - spread * 0.12);
  const max = rawMax + spread * 0.12;
  const left = 48;
  const right = 350;
  const top = 22;
  const bottom = 142;
  const points = orderedPrices.map((price, index) => ({
    price,
    x: orderedPrices.length === 1
      ? (left + right) / 2
      : left + (index / (orderedPrices.length - 1)) * (right - left),
    y: bottom - ((price.price - min) / (max - min)) * (bottom - top),
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const gridValues = [max, (max + min) / 2, min];

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox="0 0 360 190"
        className="h-48 w-full"
        role="img"
        aria-label="物品价格变化折线图"
      >
        {gridValues.map((value, index) => {
          const y = top + (index / 2) * (bottom - top);
          return (
            <g key={index}>
              <line x1={left} y1={y} x2={right} y2={y} stroke="#e5e7eb" strokeDasharray="3 4" />
              <text x="2" y={y + 4} fill="#9ca3af" fontSize="10">¥{value.toFixed(0)}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.price.id}>
            <circle cx={point.x} cy={point.y} r="5" fill="white" stroke="#2563eb" strokeWidth="3" />
            <title>{`${point.price.date}: ¥${point.price.price.toFixed(2)}`}</title>
          </g>
        ))}
        <text x={left} y="174" fill="#9ca3af" fontSize="10" textAnchor="start">
          {orderedPrices[0].date}
        </text>
        {orderedPrices.length > 1 && (
          <text x={right} y="174" fill="#9ca3af" fontSize="10" textAnchor="end">
            {orderedPrices[orderedPrices.length - 1].date}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ItemInput>(emptyForm);
  const [moveProjectId, setMoveProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseForm, setPurchaseForm] = useState<PurchaseDetails>({ price: '', platform_id: null, shop: '' });

  const loadData = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const [itemData, categoryData, platformData, firstProjectsPage] = await Promise.all([
        api.getItem(Number(itemId)),
        api.getCategories(),
        api.getPlatforms(),
        api.getProjects(1),
      ]);
      const laterPages = await Promise.all(
        Array.from({ length: Math.max(0, firstProjectsPage.pagination.totalPages - 1) }, (_, index) =>
          api.getProjects(index + 2),
        ),
      );
      setItem(itemData);
      setCategories(categoryData);
      setPlatforms(platformData);
      setProjects([...firstProjectsPage.data, ...laterPages.flatMap((page) => page.data)]);
    } catch (err) {
      console.error('加载物品详情失败', err);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startEditing = () => {
    if (!item) return;
    setForm({
      name: item.name,
      purchased: item.purchased,
      must_buy: item.must_buy,
      price: item.price,
      platform_id: item.platform_id,
      shop: item.shop || '',
      remark: item.remark || '',
      category_id: item.category_id,
    });
    setMoveProjectId(item.project_id);
    setFormError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!item || !form.name.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.updateItem(item.id, form);
      if (!item.purchased && !form.purchased && moveProjectId !== null && moveProjectId !== item.project_id) {
        await api.moveItem(item.id, moveProjectId);
      }
      await loadData();
      setEditing(false);
    } catch (err) {
      console.error('保存物品失败', err);
      setFormError(err instanceof Error ? err.message : '保存失败，请重试');
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const openPurchaseDialog = () => {
    if (!item) return;
    setPurchaseForm({ price: item.price?.toString() || '', platform_id: item.platform_id, shop: item.shop || '' });
    setPurchaseError('');
    setPurchaseDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!item) return;
    const price = Number(purchaseForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      setPurchaseError('请输入有效的购买价格');
      return;
    }

    setSubmitting(true);
    setPurchaseError('');
    try {
      await api.completeItemPurchase(item.id, {
        price,
        platform_id: purchaseForm.platform_id,
        shop: purchaseForm.shop,
      });
      setItem(await api.getItem(item.id));
      setPurchaseDialogOpen(false);
    } catch (err) {
      console.error('保存购买信息失败', err);
      setPurchaseError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await api.deleteItem(item.id);
      navigate(-1);
    } catch (err) {
      console.error('删除物品失败', err);
    }
  };

  const prices = item?.prices || [];
  const minPrice = prices.length ? Math.min(...prices.map((price) => price.price)) : null;
  const maxPrice = prices.length ? Math.max(...prices.map((price) => price.price)) : null;

  return (
    <Layout showNav={false}>
      <div className="h-screen flex flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-surface px-4 pt-4 pb-3">
          <button
            type="button"
            aria-label="返回"
            onClick={() => navigate(-1)}
            className="-ml-1 flex h-9 w-9 items-center justify-center text-gray-500"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">
            {editing ? '编辑物品' : item?.name || '物品详情'}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {loading ? (
            <div className="mt-2 h-48 animate-pulse rounded-2xl bg-gray-100" />
          ) : !item ? (
            <div className="py-16 text-center text-sm text-gray-400">物品不存在或无法访问</div>
          ) : editing ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-3 border-b border-gray-50 py-3">
                <label className="w-20 shrink-0 text-sm text-gray-500">物品名称</label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  placeholder="请输入"
                  className="h-10 flex-1 rounded-lg border-gray-200 bg-white text-sm text-ink"
                />
              </div>

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
                          selected
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-50 py-3">
                <label className="text-sm text-gray-500">购买状态</label>
                <div className="flex rounded-lg bg-gray-100 p-1" role="group" aria-label="购买状态">
                  <button
                    type="button"
                    aria-pressed={!form.purchased}
                    onClick={() => setForm({ ...form, purchased: false })}
                    className={`rounded-md px-3 py-1.5 text-sm ${!form.purchased ? 'bg-white font-medium text-ink shadow-sm' : 'text-gray-500'}`}
                  >
                    待购
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.purchased}
                    onClick={() => setForm({ ...form, purchased: true })}
                    className={`rounded-md px-3 py-1.5 text-sm ${form.purchased ? 'bg-white font-medium text-ink shadow-sm' : 'text-gray-500'}`}
                  >
                    已购
                  </button>
                </div>
              </div>

              {form.purchased && (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-50 py-3">
                    <label className="w-20 shrink-0 text-sm text-gray-500">购买价格</label>
                    <Input
                      type="number"
                      value={String(form.price ?? '')}
                      onChange={(value) => setForm({ ...form, price: value ? Number(value) : null })}
                      placeholder="0.00"
                      className="h-10 flex-1 rounded-lg border-gray-200 bg-white text-sm text-ink"
                    />
                  </div>
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
                              selected
                                ? 'border-primary bg-primary/10 font-medium text-primary'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {platform.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-b border-gray-50 py-3">
                    <label className="w-20 shrink-0 text-sm text-gray-500">购买店铺</label>
                    <Input
                      type="text"
                      value={form.shop || ''}
                      onChange={(value) => setForm({ ...form, shop: value })}
                      placeholder="店铺名称"
                      className="h-10 flex-1 rounded-lg border-gray-200 bg-white text-sm text-ink"
                    />
                  </div>
                </>
              )}

              {!item.purchased && !form.purchased && (
                <div className="border-b border-gray-50 py-3">
                  <span className="text-sm text-gray-500">所属清单</span>
                  {projects.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {projects.map((project) => {
                        const selected = (moveProjectId ?? item.project_id) === project.id;
                        return (
                          <button
                            key={project.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setMoveProjectId(project.id)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              selected
                                ? 'border-primary bg-primary/10 font-medium text-primary'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {project.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : <p className="mt-2 text-sm text-gray-400">没有可选清单</p>}
                </div>
              )}

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
              {formError && <p className="pt-2 text-sm text-red-500">{formError}</p>}

              <div className="flex items-start gap-3 py-3">
                <label className="w-20 shrink-0 pt-2 text-sm text-gray-500">备注</label>
                <TextArea
                  value={form.remark || ''}
                  onChange={(value) => setForm({ ...form, remark: value })}
                  placeholder="添加备注..."
                  rows={3}
                  className="min-h-[72px] flex-1 resize-none rounded-lg border-gray-200 bg-white text-sm text-ink"
                />
              </div>

              <div className="mt-3 flex gap-3">
                <Button
                  fill="outline"
                  onClick={() => setEditing(false)}
                  className="h-11 flex-1 rounded-xl border-gray-200 text-gray-600"
                >
                  取消
                </Button>
                <Button
                  fill="none"
                  onClick={handleSave}
                  disabled={!form.name.trim() || submitting}
                  className="h-11 flex-1 rounded-xl bg-primary font-medium text-white disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <section className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {item.category && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                      {item.category.name}
                    </span>
                  )}
                  {item.must_buy && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <Star size={13} fill="currentColor" />必购
                    </span>
                  )}
                  <button
                    type="button"
                    aria-pressed={item.purchased}
                    onClick={item.purchased ? startEditing : openPurchaseDialog}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.purchased ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.purchased ? <Check size={14} /> : <Circle size={14} />}
                    {item.purchased ? '已购' : '待购'}
                  </button>
                </div>

                {item.purchased && item.price !== null && (
                  <div className="mb-4 text-3xl font-bold tracking-tight text-primary">
                    ¥{Number(item.price).toFixed(2)}
                  </div>
                )}

                <dl className="space-y-3 text-sm">
                  {item.purchased && (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-400">购买平台</dt>
                        <dd className="text-right text-ink">{item.platform?.name || '未填写'}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-400">购买店铺</dt>
                        <dd className="text-right text-ink">{item.shop || '未填写'}</dd>
                      </div>
                    </>
                  )}
                  {item.remark && (
                    <div className="border-t border-gray-100 pt-3">
                      <dt className="mb-1 text-gray-400">备注</dt>
                      <dd className="whitespace-pre-wrap text-ink">{item.remark}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4">
                <button
                  type="button"
                  onClick={() => navigate(`/price-history/${item.id}?name=${encodeURIComponent(item.name)}`)}
                  className="mb-2 flex w-full items-center justify-between text-left"
                >
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={16} />价格走势</h2>
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    {prices.length} 条记录
                    <ChevronRight size={17} />
                  </span>
                </button>
                <PriceLineChart prices={prices} />
                {minPrice !== null && maxPrice !== null && (
                  <p className="mt-1 text-center text-xs text-gray-500">
                    最低 ¥{minPrice.toFixed(2)} <span className="px-1 text-gray-300">·</span> 最高 ¥{maxPrice.toFixed(2)}
                  </p>
                )}
              </section>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  fill="outline"
                  onClick={startEditing}
                  className="h-11 rounded-xl border-gray-200 text-ink"
                >
                  <span className="flex items-center gap-2"><Pencil size={16} />编辑</span>
                </Button>
                <Button
                  fill="outline"
                  onClick={() => setDeleteOpen(true)}
                  className="h-11 rounded-xl border-red-100 text-red-500"
                >
                  <span className="flex items-center gap-2"><Trash2 size={16} />删除</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除物品"
        message={`确定删除“${item?.name || ''}”吗？相关价格记录也会一并删除。`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <PurchaseDetailsDialog
        open={purchaseDialogOpen && !!item}
        itemName={item?.name || '物品'}
        platforms={platforms}
        value={purchaseForm}
        error={purchaseError}
        submitting={submitting}
        onChange={setPurchaseForm}
        onConfirm={handleConfirmPurchase}
        onClose={() => setPurchaseDialogOpen(false)}
      />

    </Layout>
  );
}
