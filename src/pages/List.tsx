/**
 * 清单页：按项目聚合展示
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Folder, Package } from 'lucide-react';
import { Button, Input, ActionSheet } from '@nutui/nutui-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PullRefresh from '@/components/PullRefresh';
import DatePicker from '@/components/DatePicker';
import { api } from '@/lib/api';
import type { Project } from '@shared/types';

export default function List() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const today = () => new Date().toISOString().split('T')[0];

  // 添加项目
  const [addOpen, setAddOpen] = useState(false);
  const [addDatePickerOpen, setAddDatePickerOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  // 编辑/删除项目
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState(today());
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // ActionSheet 目标
  const [actionSheetTarget, setActionSheetTarget] = useState<Project | null>(null);

  const loadProjects = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(isRefresh ? false : true);
        setRefreshing(isRefresh);
      } else {
        setLoadingMore(true);
      }

      const response = await api.getProjects(page);

      if (page === 1) {
        setProjects(response.data);
      } else {
        setProjects((prev) => [...prev, ...response.data]);
      }

      setCurrentPage(page);
      setHasMore(page < response.pagination.totalPages);
    } catch (err) {
      console.error('加载项目失败', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadProjects(1);
  }, [loadProjects]);

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    if (loadingMore || !hasMore || !scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      loadProjects(currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage, loadProjects]);

  const handleRefresh = async () => {
    await loadProjects(1, true);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const project = await api.createProject(newName, newDate);
      setProjects((prev) => [project, ...prev]);
      setNewName('');
      setNewDate(today());
      setAddOpen(false);
    } catch (err) {
      console.error('创建项目失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.updateProject(editTarget.id, editName, editDate);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) {
      console.error('编辑项目失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('删除项目失败', err);
    }
  };

  const openEdit = (project: Project) => {
    setEditTarget(project);
    setEditName(project.name);
    setEditDate(project.date || today());
    setEditOpen(true);
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <PullRefresh onRefresh={handleRefresh}>
            <div className="px-4 pt-6 pb-20">
              {loading && !refreshing ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                    <Folder size={28} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">暂无项目</p>
                  <p className="text-xs text-gray-400">点击右下角加号创建项目</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-xl border-gray-50 bg-white overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-3 p-4 active:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="text-base font-semibold text-ink truncate"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(project);
                              }}
                            >
                              {project.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Package size={12} />
                              {project.item_count || 0} 件物品
                            </span>
                            <span>{project.date}</span>
                            {Number(project.total_spent) > 0 && (
                              <span className="text-primary font-medium bg-transparent px-1.5 py-0 text-xs">
                                ¥{Number(project.total_spent).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="default"
                          fill="none"
                          size="small"
                          className="h-8 w-8 text-gray-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionSheetTarget(project);
                          }}
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {loadingMore && (
                    <div className="py-4 text-center">
                      <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm text-gray-400 mt-2">加载更多...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PullRefresh>
        </div>
      </div>

      {/* 悬浮添加按钮 */}
      <Button
        type="primary"
        size="small"
        className="fixed bottom-20 right-4 w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-90 transition-transform z-30"
        onClick={() => setAddOpen(true)}
      >
        <Plus size={20} />
      </Button>

      {/* 添加项目弹窗 */}
      <Modal open={addOpen} title="新建项目" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">项目名称</label>
            <Input
              type="text"
              value={newName}
              onChange={(val) => setNewName(val)}
              placeholder="请输入项目名称"
              autoFocus
              className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
            />
          </div>
          <div
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-ink flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setAddDatePickerOpen(true)}
          >
            <span>{newDate}</span>
            <div className="text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <Button
            type="primary"
            onClick={handleAdd}
            disabled={!newName.trim() || submitting}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </div>
      </Modal>

      {/* 添加项目日期选择器 */}
      <DatePicker
        open={addDatePickerOpen}
        value={newDate}
        onChange={setNewDate}
        onClose={() => setAddDatePickerOpen(false)}
      />

      {/* 编辑项目弹窗 */}
      <Modal open={editOpen} title="编辑项目" onClose={() => { setEditOpen(false); setEditTarget(null); }}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">项目名称</label>
            <Input
              type="text"
              value={editName}
              onChange={(val) => setEditName(val)}
              autoFocus
              className="h-12 rounded-xl border-gray-200 bg-white text-ink placeholder:text-gray-400 focus-visible:ring-primary/10 focus-visible:border-primary"
            />
          </div>
          <div
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-ink flex items-center justify-between cursor-pointer active:bg-gray-50"
            onClick={() => setEditDatePickerOpen(true)}
          >
            <span>{editDate}</span>
            <div className="text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="default"
              fill="outline"
              onClick={() => {
                if (editTarget) setDeleteTarget(editTarget);
                setEditOpen(false);
              }}
              className="flex-1 h-12 rounded-xl border-red-200 text-red-500 hover:bg-red-50 transition-all"
            >
              删除项目
            </Button>
            <Button
              type="primary"
              onClick={handleEdit}
              disabled={!editName.trim() || submitting}
              className="flex-1 h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑项目日期选择器 */}
      <DatePicker
        open={editDatePickerOpen}
        value={editDate}
        onChange={setEditDate}
        onClose={() => setEditDatePickerOpen(false)}
      />

      {/* 项目操作菜单 */}
      <ActionSheet
        visible={!!actionSheetTarget}
        options={[{ name: '编辑' }, { name: '删除' }]}
        onSelect={(_item, index) => {
          if (actionSheetTarget) {
            if (index === 0) {
              openEdit(actionSheetTarget);
            } else if (index === 1) {
              setDeleteTarget(actionSheetTarget);
            }
          }
          setActionSheetTarget(null);
        }}
        onCancel={() => setActionSheetTarget(null)}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除项目"
        message={`确定删除"${deleteTarget?.name}"吗？项目下所有物品将一并删除。`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
