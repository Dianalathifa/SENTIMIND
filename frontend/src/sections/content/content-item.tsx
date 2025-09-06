// src/sections/content_management/types.ts

export interface IContentItem {
  id: string;
  author_admin_id: number;
  title: string;
  explanation_text?: string;
  excerpt?: string;
  cover_image_url?: string;
  published_at?: string; // ISO string, e.g., "2023-10-27T10:00:00Z"
  views_count: number;
  comments_count: number;
  shares_count: number;
  status: 'published' | 'draft' | 'archived';
  visualization_data_json?: string; // Raw JSON string from backend
  recommendation_text?: string;
  related_links_json?: string; // Raw JSON string from backend
  // Jika Anda ingin menampilkan nama penulis, Anda mungkin perlu memuatnya secara terpisah
  // atau meminta backend untuk menyertakannya dalam respons konten.
  author_username?: string; // Contoh: jika backend menyertakan username admin
}
