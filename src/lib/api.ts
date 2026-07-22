/**
 * API 请求客户端
 */

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

interface PaginationResponse<T> {
  data: T;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || '请求失败');
  }

  // 处理分页响应
  if (data.data && data.pagination) {
    return data as unknown as T;
  }

  return data.data as T;
}

export const api = {
  // 认证
  register: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () =>
    request<{ user: User }>('/auth/me'),
  resetPassword: (oldPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  // 项目
  getProjects: (page: number = 1) =>
    request<PaginationResponse<Project[]>>(`/projects?page=${page}`),
  createProject: (name: string, date?: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, date }),
    }),
  updateProject: (id: number, name: string, date?: string) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, date }),
    }),
  deleteProject: (id: number) =>
    request<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // 物品
  getItems: (projectId: number) =>
    request<Item[]>(`/items/project/${projectId}`),
  createItem: (projectId: number, input: ItemInput) =>
    request<Item>(`/items/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateItem: (id: number, input: ItemInput) =>
    request<Item>(`/items/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  reorderItems: (projectId: number, order: number[]) =>
    request<{ success: boolean }>(`/items/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    }),
  deleteItem: (id: number) =>
    request<{ success: boolean }>(`/items/items/${id}`, {
      method: 'DELETE',
    }),

  // 分类
  getCategories: () =>
    request<Category[]>('/categories'),
  createCategory: (name: string) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateCategory: (id: number, name: string) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (id: number) =>
    request<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
  reorderCategories: (order: number[]) =>
    request<{ success: boolean }>('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    }),

  // 购买平台
  getPlatforms: () =>
    request<Platform[]>('/platforms'),
  createPlatform: (name: string) =>
    request<Platform>('/platforms', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updatePlatform: (id: number, name: string) =>
    request<Platform>(`/platforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deletePlatform: (id: number) =>
    request<{ success: boolean }>(`/platforms/${id}`, {
      method: 'DELETE',
    }),
  reorderPlatforms: (order: number[]) =>
    request<{ success: boolean }>('/platforms/reorder', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    }),

  // 价格走势
  getPrices: (itemId: number) =>
    request<PriceRecord[]>(`/prices/item/${itemId}`),
  createPrice: (itemId: number, input: PriceInput) =>
    request<PriceRecord>(`/prices/item/${itemId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updatePrice: (id: number, input: PriceInput) =>
    request<PriceRecord>(`/prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deletePrice: (id: number) =>
    request<{ success: boolean }>(`/prices/${id}`, {
      method: 'DELETE',
    }),

  // 统计
  getYearStats: () =>
    request<YearStats>('/stats/year'),
  getPendingItems: () =>
    request<PendingItem[]>('/stats/pending'),
};

// 类型导入
import type {
  User, Project, Category, Platform, Item, ItemInput,
  PriceRecord, PriceInput, PendingItem, YearStats,
} from '@shared/types';
