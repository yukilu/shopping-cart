// 共享类型定义

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  date: string;
  created_at: string;
  item_count?: number;
  total_spent?: number;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Platform {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface PriceRecord {
  id: number;
  item_id: number;
  price: number;
  date: string;
  platform_id: number | null;
  platform_name?: string | null;
  remark?: string | null;
  created_at: string;
}

export interface Item {
  id: number;
  project_id: number;
  category_id: number | null;
  platform_id: number | null;
  name: string;
  purchased: boolean;
  must_buy: boolean;
  price: number | null;
  shop: string | null;
  remark: string | null;
  sort_order: number;
  created_at: string;
  category?: Category | null;
  platform?: Platform | null;
  prices?: PriceRecord[];
}

export interface ItemInput {
  category_id?: number | null;
  name: string;
  purchased: boolean;
  must_buy?: boolean;
  price?: number | null;
  platform_id?: number | null;
  shop?: string | null;
  remark?: string | null;
}

export interface PriceInput {
  price: number;
  date: string;
  platform_id?: number | null;
  remark?: string | null;
}

export interface PendingItem {
  id: number;
  name: string;
  project_id: number;
  project_name: string;
  category_name: string | null;
  remark: string | null;
  must_buy: boolean;
  created_at: string;
}

export interface YearStats {
  total: number;
  byMonth: { month: string; total: number }[];
}
