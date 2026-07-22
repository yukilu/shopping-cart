/**
 * 购买平台维护页
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, ShoppingBag } from 'lucide-react';
import { Button, Input } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import SortableList, { GripVertical } from '@/components/SortableList';
import { api } from '@/lib/api';
import type { Platform } from '@shared/types';

export default function Platforms() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Platform | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const data = await api.getPlatforms();
      setPlatforms(data);
    } catch (err) {
      console.error('加载平台失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const platform = await api.createPlatform(name);
      setPlatforms((prev) => [platform, ...prev]);
      setName('');
      setAddOpen(false);
    } catch (err) {
      console.error('创建平台失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !name.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.updatePlatform(editTarget.id, name);
      setPlatforms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditTarget(null);
      setName('');
    } catch (err) {
      console.error('编辑平台失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePlatform(deleteTarget.id);
      setPlatforms((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除平台失败', err);
    }
  };

  const openEdit = (p: Platform) => {
    setEditTarget(p);
    setName(p.name);
  };

  const handleReorder = async (newOrder: Platform[]) => {
    const order = newOrder.map((p) => p.id);
    setPlatforms(newOrder);
    try {
      await api.reorderPlatforms(order);
    } catch (err) {
      console.error('排序失败', err);
      loadPlatforms();
    }
  };

  return (
    <Layout showNav={false}>
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-surface z-30 px-4 pt-4 pb-2 flex items-center gap-3">
        <Button
          fill="none"
          size="small"
          onClick={() => navigate('/profile')}
          className="p-1 -ml-1 text-gray-500 h-8 w-8"
        >
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-lg font-bold text-ink flex-1">购买平台维护</h1>
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
        ) : platforms.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
              <ShoppingBag size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 mb-1">暂无平台</p>
            <p className="text-xs text-gray-400">点击右上角添加购买平台</p>
          </div>
        ) : (
          <SortableList
            items={platforms}
            onReorder={handleReorder}
            getKey={(p) => p.id}
            renderItem={(p, dragHandleProps) => (
              <div className="rounded-xl border-gray-50">
                <div className="flex items-center gap-3 p-3">
                  <div {...dragHandleProps} className="text-gray-300 flex-shrink-0">
                    <GripVertical size={18} />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={14} className="text-primary" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-ink">{p.name}</span>
                  <Button
                    fill="none"
                    size="small"
                    onClick={() => openEdit(p)}
                    className="h-7 w-7 text-gray-400 hover:text-primary"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    fill="none"
                    size="small"
                    onClick={() => setDeleteTarget(p)}
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

      {/* 添加平台弹窗 */}
      <Modal open={addOpen} title="添加平台" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">平台名称</label>
            <Input
              type="text"
              value={name}
              onChange={(val) => setName(val)}
              placeholder="请输入平台名称"
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

      {/* 编辑平台弹窗 */}
      <Modal open={!!editTarget} title="编辑平台" onClose={() => { setEditTarget(null); setName(''); }}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">平台名称</label>
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
        title="删除平台"
        message={`确定删除"${deleteTarget?.name}"吗？`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
