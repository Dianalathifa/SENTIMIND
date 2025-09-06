// Pastikan file ini berada di lokasi yang benar sesuai impor di content-detail.tsx
// Misalnya: frontend/src/sections/content/types.ts

// Definisi untuk Tags
export interface ITag {
  id: string; // Asumsi ID tag adalah string
  tag_name: string;
}

// Definisi untuk Tautan Terkait
export interface IRelatedLink {
  title: string;
  url: string;
}

// Definisi untuk item data di dalam visualisasi (misalnya, { label: 'Positif', value: 100 })
export interface IVisualizationDataItem {
  label: string;
  value: number;
}

// Definisi untuk seluruh objek data visualisasi
export interface IVisualizationData {
  chartType: 'pie' | 'bar' | 'line' | 'doughnut'; // Tipe chart yang didukung oleh Chart.js
  data: IVisualizationDataItem[]; // Array data untuk chart
  title?: string; // Judul chart (opsional)
}

// Definisi utama untuk item Konten
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
  visualization_data?: IVisualizationData; // <--- PERUBAHAN PENTING: Menggunakan tipe IVisualizationData yang baru
  recommendation_text?: string;
  related_links?: IRelatedLink[]; // <--- PERUBAHAN PENTING: Menggunakan tipe IRelatedLink[]
  author_username?: string; // Contoh: jika backend menyertakan username admin
  tags?: ITag[]; // <--- PERUBAHAN PENTING: Menggunakan tipe ITag[]
}