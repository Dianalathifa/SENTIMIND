import axios from 'axios';
import React, { useState, useEffect } from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';

import { IContentItem } from '../types'; // Sesuaikan jalur impor

interface ContentFormProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Callback untuk memuat ulang data di parent
  content?: IContentItem; // Opsional, jika untuk mode edit
}

export function ContentForm({ open, onClose, onSaveSuccess, content }: ContentFormProps) {
  // Mengubah tipe formData agar visualization_data dan related_links adalah string
  const [formData, setFormData] = useState<Partial<Omit<IContentItem, 'visualization_data' | 'related_links'>> & {
    visualization_data: string;
    related_links: string;
  }>({
    title: '',
    explanation_text: '',
    excerpt: '',
    cover_image_url: '',
    status: 'draft',
    recommendation_text: '',
    visualization_data: '', // Inisialisasi sebagai string
    related_links: '',     // Inisialisasi sebagai string
  });
  const [tagsInput, setTagsInput] = useState<string>(''); // State untuk input tags (string koma-separated)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Isi form data jika dalam mode edit
    if (content) {
      setFormData({
        id: content.id,
        title: content.title,
        explanation_text: content.explanation_text,
        excerpt: content.excerpt,
        cover_image_url: content.cover_image_url,
        status: content.status,
        recommendation_text: content.recommendation_text,
        // Konversi objek JSON kembali ke string untuk ditampilkan di TextField
        // Gunakan JSON.stringify(..., null, 2) untuk format yang rapi di textarea
        // Pastikan untuk menangani kasus di mana data mungkin sudah string (jika backend belum sepenuhnya sinkron)
        visualization_data: (typeof content.visualization_data === 'object' && content.visualization_data !== null)
          ? JSON.stringify(content.visualization_data, null, 2)
          : (content.visualization_data || ''), // Jika string atau null/undefined
        related_links: (typeof content.related_links === 'object' && content.related_links !== null)
          ? JSON.stringify(content.related_links, null, 2)
          : (content.related_links || ''), // Jika string atau null/undefined
      });
      // Inisialisasi tagsInput dari array tags yang ada
      if (content.tags && content.tags.length > 0) {
        setTagsInput(content.tags.map(tag => tag.tag_name).join(', '));
      } else {
        setTagsInput('');
      }
    } else {
      // Reset form data untuk mode tambah baru
      setFormData({
        title: '',
        explanation_text: '',
        excerpt: '',
        cover_image_url: '',
        status: 'draft',
        recommendation_text: '',
        visualization_data: '', // Reset ke string kosong
        related_links: '',     // Reset ke string kosong
      });
      setTagsInput(''); // Reset tags input juga
    }
    setError(null); // Reset error saat dialog dibuka/ditutup
  }, [open, content]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    if (name === 'tagsInput') {
      setTagsInput(value);
    } else {
      setFormData((prev) => ({ ...prev, [name as string]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Anda belum login. Silakan login.');
        setLoading(false);
        return;
      }

      // Validasi dan konversi JSON fields kembali ke string sebelum dikirim ke backend
      let visualizationDataJsonString: string | null = null;
      if (formData.visualization_data) {
        try {
          // Pastikan input adalah string sebelum di-parse
          const parsed = JSON.parse(String(formData.visualization_data));
          visualizationDataJsonString = JSON.stringify(parsed); // Re-stringify untuk memastikan format konsisten
        } catch (jsonError) {
          setError('Format JSON untuk Data Visualisasi tidak valid.');
          setLoading(false);
          return;
        }
      }

      let relatedLinksJsonString: string | null = null;
      if (formData.related_links) {
        try {
          // Pastikan input adalah string sebelum di-parse
          const parsed = JSON.parse(String(formData.related_links));
          relatedLinksJsonString = JSON.stringify(parsed); // Re-stringify
        } catch (jsonError) {
          setError('Format JSON untuk Tautan Terkait tidak valid.');
          setLoading(false);
          return;
        }
      }

      // Proses tags: ubah string koma-separated menjadi array of strings
      const tagsArray = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // --- Perbaikan: Bangun dataToSend secara eksplisit untuk menghindari error delete ---
      const dataToSend: { [key: string]: any } = {
        title: formData.title,
        explanation_text: formData.explanation_text,
        excerpt: formData.excerpt,
        cover_image_url: formData.cover_image_url,
        status: formData.status,
        recommendation_text: formData.recommendation_text,
        
        // Kirim sebagai string dengan nama _json agar sesuai dengan kolom database
        visualization_data_json: visualizationDataJsonString, 
        related_links_json: relatedLinksJsonString,           
        tags: tagsArray, // Tambahkan array tags ke data yang akan dikirim
      };

      // Untuk permintaan PUT (edit), sertakan ID dan nilai-nilai read-only yang ada
      if (content?.id) {
        dataToSend.id = content.id;
        dataToSend.views_count = content.views_count;
        dataToSend.comments_count = content.comments_count;
        dataToSend.shares_count = content.shares_count;
        dataToSend.published_at = content.published_at;
      }
      // --- Akhir Perbaikan ---


      if (content?.id) {
        // Mode Edit (PUT request)
        await axios.put(`http://localhost:5000/api/content/${content.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } else {
        // Mode Tambah Baru (POST request)
        await axios.post('http://localhost:5000/api/content', dataToSend, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      }

      onSaveSuccess(); // Beri tahu parent bahwa penyimpanan berhasil
      onClose(); // Tutup dialog
    } catch (err) {
      console.error('Error saving content:', err);
      if (axios.isAxiosError(err) && err.response) {
        // LOG respons error dari backend untuk debugging lebih lanjut
        console.error('Backend error response:', err.response.data); 
        console.error('Backend error status:', err.response.status);

        if (err.response.status === 401) {
          setError('Anda tidak memiliki izin. Sesi mungkin telah berakhir. Silakan login kembali.');
          localStorage.removeItem('accessToken'); // Hapus token yang tidak valid
          // Anda mungkin ingin mengarahkan pengguna ke halaman login di sini
          // router.push('/sign-in'); // Jika ada router yang tersedia di ContentForm
        } else {
          // Coba akses pesan error dari backend, jika ada
          setError(`Gagal menyimpan konten: ${err.response.data?.error || 'Terjadi kesalahan tidak dikenal dari server.'}`);
        }
      } else {
        setError('Terjadi kesalahan jaringan atau tak terduga saat menyimpan konten. Periksa koneksi Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{content ? 'Edit Konten Analisis' : 'Tambah Konten Analisis Baru'}</DialogTitle>
      <DialogContent dividers>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              name="title"
              label="Judul Konten"
              value={formData.title || ''}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              name="explanation_text"
              label="Penjelasan Konten (Teks Lengkap)"
              value={formData.explanation_text || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={6}
            />
            <TextField
              name="excerpt"
              label="Ringkasan Konten"
              value={formData.excerpt || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              name="cover_image_url"
              label="URL Gambar Sampul"
              value={formData.cover_image_url || ''}
              onChange={handleChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={formData.status || 'draft'}
                label="Status"
                onChange={handleChange}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="recommendation_text"
              label="Teks Rekomendasi/Insight"
              value={formData.recommendation_text || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              name="visualization_data" // Menggunakan nama field baru
              label="Data Visualisasi (JSON)"
              value={formData.visualization_data || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={5}
              helperText="Masukkan data JSON valid untuk visualisasi."
            />
            <TextField
              name="related_links" // Menggunakan nama field baru
              label="Tautan Terkait (JSON Array)"
              value={formData.related_links || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              helperText="Masukkan array JSON valid: [{'title': 'Link 1', 'url': 'http://...'}]"
            />
            <TextField
              name="tagsInput"
              label="Tags (pisahkan dengan koma)"
              value={tagsInput}
              onChange={handleChange}
              fullWidth
              helperText="Contoh: Sentimen, Pendidikan, Teknologi"
            />
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Batal
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : (content ? 'Simpan Perubahan' : 'Tambah Konten')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
