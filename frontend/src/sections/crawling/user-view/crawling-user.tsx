import axios from 'axios';
import { useState, useCallback } from 'react';

import { LoadingButton } from '@mui/lab';
import {
  Box,
  Card,
  Stack,
  TextField,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Link,
  CircularProgress,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard'; // Pastikan ini diimpor dengan benar

interface ScrapedTweet {
  id_str: string;
  tweet_url?: string;
  username?: string;
  full_text?: string;
  favorite_count?: number;
  retweet_count?: number;
  created_at?: string;
  user_id_str?: string;
  conversation_id_str?: string;
  in_reply_to_screen_name?: string;
  lang?: string;
  location?: string;
  quote_count?: number;
  reply_count?: number;
  image_url?: string;

  hashtags?: string;
  mentions?: string;
  cashtags?: string;
  retweet?: boolean;
  video?: boolean;
}

export function CrawlingUserView() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState<number | ''>(50); // Default limit 50
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  // Inisialisasi scrapedData dengan array kosong
  const [scrapedData, setScrapedData] = useState<ScrapedTweet[]>([]);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [totalScraped, setTotalScraped] = useState<number>(0);

  const handleScrape = useCallback(async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    setScrapedData([]); // Reset data scraping sebelumnya
    setDownloadFilename(null);
    setTotalScraped(0);

    console.log('DEBUG (Frontend): Keyword state value:', keyword);
    console.log('DEBUG (Frontend): Keyword after trim:', keyword.trim());
    console.log('DEBUG (Frontend): Limit state value:', limit);

    // Validasi input
    if (!keyword.trim()) {
      setErrorMessage('Kata kunci tidak boleh kosong.');
      setLoading(false);
      return;
    }
    if (typeof limit !== 'number' || limit <= 0) {
      setErrorMessage('Limit harus angka positif.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      console.log('DEBUG (Frontend): Token dari localStorage:', token);
      if (!token) {
        console.log('DEBUG (Frontend): Token kosong atau tidak ada. Mengarahkan ke halaman login.');
        setErrorMessage('Anda belum login atau sesi telah berakhir. Silakan login.');
        router.push('/sign-in');
        setLoading(false);
        return;
      }

      console.log('DEBUG (Frontend): Token ditemukan. Melanjutkan permintaan axios.');

      const response = await axios.get('http://localhost:5000/api/scraping/run', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          keyword: keyword.trim(),
          count: limit,
        },
        timeout: 1200000, // Timeout 1200 detik (20 menit) - disesuaikan agar cukup untuk scraping besar
      });

      if (response.status === 200) {
        setSuccessMessage(response.data.message || 'Scraping berhasil!');
        const receivedData = response.data.preview_data || [];
        setScrapedData(receivedData);
        setTotalScraped(response.data.total_scraped || 0);
        setDownloadFilename(response.data.filename || null);

        console.log('DEBUG (Frontend): Data diterima:', receivedData);

      } else {
        setErrorMessage(response.data.error || 'Scraping gagal.');
      }
    } catch (error: unknown) {
      console.error('Error during scraping:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          setErrorMessage('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else if (error.response.status === 500) {
          setErrorMessage(`Terjadi kesalahan pada server: ${error.response.data?.error || 'Unknown error'}.`);
        } else {
          const backendErrorMsg = error.response.data?.error || error.response.data?.message;
          setErrorMessage(backendErrorMsg || 'Terjadi kesalahan pada server saat scraping.');
        }
      } else if (error instanceof Error) {
        setErrorMessage(`Terjadi kesalahan tak terduga: ${error.message}`);
      } else {
        setErrorMessage('Terjadi kesalahan jaringan atau tak terduga.');
      }
    } finally {
      setLoading(false);
    }
  }, [keyword, limit, router]);

  const handleDownloadCsv = useCallback(() => {
    if (downloadFilename) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrorMessage('Anda belum login atau sesi telah berakhir. Tidak bisa mendownload.');
        router.push('/sign-in');
        return;
      }

      const downloadUrl = `http://localhost:5000/api/scraping/download-csv/${downloadFilename}`;

      axios.get(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      })
        .then(response => {
          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', downloadFilename);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          window.URL.revokeObjectURL(url);
          setSuccessMessage('File CSV berhasil diunduh!');
        })
        .catch(downloadError => {
          console.error('Download error:', downloadError);
          if (axios.isAxiosError(downloadError) && downloadError.response) {
            if (downloadError.response.status === 401) {
              setErrorMessage('Sesi berakhir atau token tidak valid. Tidak bisa mendownload.');
              localStorage.removeItem('accessToken');
              router.push('/sign-in');
            } else if (downloadError.response.status === 404) {
              setErrorMessage('File CSV tidak ditemukan di server.');
            } else {
              const backendDownloadErrorMsg = downloadError.response.data?.error || downloadError.response.data?.message;
              setErrorMessage(backendDownloadErrorMsg || 'Gagal mengunduh file CSV dari server.');
            }
          } else if (downloadError instanceof Error) {
            setErrorMessage(`Terjadi kesalahan tak terduga saat mengunduh: ${downloadError.message}`);
          } else {
            setErrorMessage('Terjadi kesalahan jaringan atau tak terduga saat mengunduh file CSV.');
          }
        });
    }
  }, [downloadFilename, router]);


  return (
    <DashboardContent> {/* Menggunakan DashboardContent untuk layout */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Crawling Data</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Jalankan proses crawling dan lihat hasilnya.
        </Typography>
      </Box>

      <Card sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField
            fullWidth
            label="Kata Kunci Crawling"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Contoh: kesehatan mental"
          />

          <TextField
            fullWidth
            label="Jumlah Data (Limit)"
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || '')}
            inputProps={{ min: 1 }}
            helperText="Jumlah tweet yang ingin dicrawl."
          />

          <LoadingButton
            fullWidth
            size="large"
            variant="contained"
            color="inherit"
            onClick={handleScrape}
            loading={loading}
            disabled={loading}
          >
            Mulai Crawling
          </LoadingButton>

          {totalScraped > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Total {totalScraped} tweet berhasil discrap dan disimpan ke database.
            </Alert>
          )}

          {downloadFilename && (
            <Button
              fullWidth
              size="large"
              variant="outlined"
              color="primary"
              onClick={handleDownloadCsv}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Download Hasil CSV ({downloadFilename})
            </Button>
          )}
        </Stack>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2, mt: 2 }}>Mencari data tweet...</Typography>
        </Box>
      )}

      {scrapedData && scrapedData.length > 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Data Hasil Scraping (Preview {scrapedData.length} Data Awal)
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="scraped data table">
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Teks Tweet</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Retweets</TableCell>
                  <TableCell>Tanggal Dibuat</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scrapedData.map((row) => (
                  <TableRow key={row.id_str}>
                    <TableCell>
                      {row.tweet_url ? (
                        <Link href={row.tweet_url} target="_blank" rel="noopener noreferrer">
                          {row.tweet_url.length > 30 ? `${row.tweet_url.substring(0, 30)}...` : row.tweet_url}
                        </Link>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{row.username || 'N/A'}</TableCell>
                    <TableCell>
                      {(row.full_text && row.full_text.length > 100) ? `${row.full_text.substring(0, 100)}...` : (row.full_text || 'N/A')}
                    </TableCell>
                    <TableCell>{row.favorite_count ?? 'N/A'}</TableCell>
                    <TableCell>{row.retweet_count ?? 'N/A'}</TableCell>
                    <TableCell>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        !loading && (totalScraped === 0 || scrapedData.length === 0) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Tidak ada data tweet untuk ditampilkan atau proses scraping belum dijalankan.
          </Alert>
        )
      )}
    </DashboardContent>
  );
}
