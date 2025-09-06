import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Container,
  Stack,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks'; // Pastikan ini diimpor dengan benar

import { DashboardContent } from 'src/layouts/dashboard'; // Asumsi layout dashboard Anda

interface AnalyzedTweet {
  id_str: string;
  keyword_used?: string;
  // Hanya perlu keyword_used untuk mendapatkan daftar keyword
}

export function KeywordOverviewView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  // Fungsi untuk mengambil semua keyword yang tersedia dari backend
  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/sign-in');
        setLoading(false);
        return;
      }

      // Mengambil data tweet untuk mengekstrak keyword.
      // Anda mungkin ingin membuat endpoint backend terpisah yang hanya mengembalikan daftar keyword
      // untuk efisiensi, tetapi untuk saat ini kita akan menggunakan endpoint yang sudah ada.
      const response = await axios.get('http://localhost:5000/api/scraping/get-recent-tweets', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 } // Ambil cukup banyak data untuk mendapatkan semua keyword
      });

      if (response.status === 200) {
        const fetchedTweets: AnalyzedTweet[] = response.data.preview_data || [];
        const uniqueKeywords = new Set<string>();
        fetchedTweets.forEach(tweet => {
          if (tweet.keyword_used && tweet.keyword_used !== '') { // Pastikan keyword tidak kosong
            uniqueKeywords.add(tweet.keyword_used);
          }
        });
        // Urutkan keyword secara alfabetis
        setAvailableKeywords(Array.from(uniqueKeywords).sort());
      } else {
        setError('Gagal memuat keyword: Terjadi kesalahan server.');
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          setError('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setError(`Gagal memuat keyword: ${err.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setError('Terjadi kesalahan jaringan saat memuat keyword.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // Fungsi untuk menavigasi ke halaman hasil dengan keyword yang dipilih
  const handleKeywordClick = (keyword: string) => {
    // Menggunakan router.push dengan state untuk meneruskan keyword
    router.push('/dashboard/hasil', { selectedKeyword: keyword });
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Kategori Analisis Sentimen Berdasarkan Keyword</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Pilih keyword untuk melihat detail analisis sentimen terkait.
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Memuat daftar keyword...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && availableKeywords.length === 0 && (
        <Alert severity="info" sx={{ my: 3 }}>
          Tidak ada keyword yang ditemukan. Pastikan data tweet sudah di-crawl dan dianalisis.
        </Alert>
      )}

      {!loading && !error && availableKeywords.length > 0 && (
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3, // Jarak antar kartu keyword
              justifyContent: 'center', // Pusatkan kartu
            }}
          >
            {availableKeywords.map((keyword) => (
              <Card
                key={keyword}
                onClick={() => handleKeywordClick(keyword)}
                sx={{
                  width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 20px)', lg: 'calc(25% - 24px)' }, // Responsif
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                  cursor: 'pointer',
                  boxShadow: 3,
                  borderRadius: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                }}
              >
                <Typography variant="h6" component="div" sx={{ textAlign: 'center', mb: 1 }}>
                  {keyword}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Klik untuk melihat detail analisis
                </Typography>
              </Card>
            ))}
          </Box>
        </Container>
      )}
    </DashboardContent>
  );
}
