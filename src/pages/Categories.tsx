/**
 * 分类维护页：分类的增删改查
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Button, Input } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ReorderableList from '@/components/ReorderableList';
import { api } from '@/lib/api';
import type { Category } from '@shared/types';

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const category = await api.createCategory(name);
      setCategories((prev) => [category, ...prev]);
      setName('');
      setAddOpen(false);
    } catch (err) {
      console.error('创建分类失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !name.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.updateCategory(editTarget.id, name);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditTarget(null);
      setName('');
    } catch (err) {
      console.error('编辑分类失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCategory(deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除分类失败', err);
    }
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setName(cat.name);
  };

  const handleReorder = async (newOrder: Category[]) => {
    const order = newOrder.map((c) => c.id);
    setCategories(newOrder);
    try {
      await api.reorderCategories(order);
    } catch (err) {
      console.error('排序失败', err);
      loadCategories();
    }
  };

  return (
    <Layout showNav={false}>
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
        <h1 className="text-lg font-bold text-ink flex-1">分类维护</h1>
        <Button
          fill="none"
          onClick={() => { setAddOpen(true); setName(''); }}
          className="text-sm text-primary font-medium"
        >
          添加
        </Button>
      </div>

      <div className="px-4 pb-20">
        {loading ? (
          <div className="space-y-2 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
              <Tag size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 mb-1">暂无分类</p>
            <p className="text-xs text-gray-400">点击右上角添加分类</p>
          </div>
        ) : (
          <ReorderableList
            items={categories}
            onReorder={handleReorder}
            getKey={(cat) => cat.id}
            getLabel={(cat) => cat.name}
            renderItem={(cat) => (
              <div className="rounded-xl border-gray-50">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Tag size={14} className="text-primary" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-ink">{cat.name}</span>
                  <Button
                    fill="none"
                    size="small"
                    onClick={() => openEdit(cat)}
                    className="h-7 w-7 text-gray-400 hover:text-primary"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    fill="none"
                    size="small"
                    onClick={() => setDeleteTarget(cat)}
                    className="h-7 w-7 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* 添加分类弹窗 */}
      <Modal open={addOpen} title="添加分类" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">分类名称</label>
            <Input
              type="text"
              value={name}
              onChange={(val) => setName(val)}
              placeholder="请输入分类名称"
              autoFocus
              className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
            />
          </div>
          <Button
            fill="none"
            onClick={handleAdd}
            disabled={!name.trim() || submitting}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {submitting ? '添加中...' : '添加'}
          </Button>
        </div>
      </Modal>

      {/* 编辑分类弹窗 */}
      <Modal open={!!editTarget} title="编辑分类" onClose={() => { setEditTarget(null); setName(''); }}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">分类名称</label>
            <Input
              type="text"
              value={name}
              onChange={(val) => setName(val)}
              autoFocus
              className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
            />
          </div>
          <Button
            fill="none"
            onClick={handleEdit}
            disabled={!name.trim() || submitting}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除分类"
        message={`确定删除"${deleteTarget?.name}"吗？相关物品将变为未分类。`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
