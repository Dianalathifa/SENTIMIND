import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { Link as RouterLink } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

import {
  Box,
  Card,
  Typography,
  Container,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink, // Menggunakan MuiLink dari Material-UI
} from '@mui/material';

import Navbar from 'src/layouts/nav-home/nav-view'; // Sesuaikan jalur import Navbar Anda

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface AnalyzedTweet {
  id_str: string;
  tweet_url?: string;
  username?: string;
  full_text?: string;
  // Mempertahankan nama asli yang diharapkan frontend
  favorite_count?: number;
  retweet_count?: number;
  // Menambahkan properti untuk nama kolom dari database backend
  likes_count?: number; // Tambahan untuk likes dari backend
  retweets_count?: number; // Tambahan untuk retweets dari backend
  created_at?: string;
  keyword_used?: string;
  sentiment?: string | null;
  sentiment_analyzed_at?: string | null;
}

interface SentimentSummary {
  Positif: number;
  Netral: number;
  Negatif: number;
}

export function PublicAnalysisResultView() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalyzedTweet[]>([]);
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState<number>(0);
  const [searchedKeyword, setSearchedKeyword] = useState<string | null>(null); // State untuk keyword yang sudah dicari

  // State untuk diagram
  const [sentimentPieData, setSentimentPieData] = useState<any>(null);
  const [tweetsPerDayBarData, setTweetsPerDayBarData] = useState<any>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysisResults([]);
    setSentimentSummary(null);
    setTotalAnalyzed(0);
    setSentimentPieData(null);
    setTweetsPerDayBarData(null);
    setSearchedKeyword(null); // Reset searched keyword

    if (!keyword.trim()) {
      setError('Kata kunci tidak boleh kosong.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/public/analysis-results', {
        params: { keyword: keyword.trim() },
      });

      if (response.status === 200) {
        if (response.data.tweets && response.data.tweets.length > 0) {
          setAnalysisResults(response.data.tweets);
          setSentimentSummary(response.data.sentiment_summary);
          setTotalAnalyzed(response.data.total_analyzed); // Corrected typo here
          setSearchedKeyword(keyword.trim()); // Set keyword yang berhasil dicari
        } else {
          // Jika tidak ada tweet, tampilkan pesan dari backend
          // dan set searchedKeyword agar bagian rekomendasi muncul
          setError(response.data.message || 'Tidak ada hasil analisis yang ditemukan untuk kata kunci ini.');
          setSearchedKeyword(keyword.trim()); // Penting: set keyword yang dicari agar rekomendasi muncul
        }
      }
    } catch (err) {
      console.error('Error fetching public analysis results:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(`Terjadi kesalahan: ${err.response.data?.error || 'Unknown error'}.`);
      } else {
        setError('Terjadi kesalahan jaringan atau tak terduga saat mengambil hasil analisis.');
      }
      setSearchedKeyword(keyword.trim()); // Set keyword yang dicari bahkan jika ada error
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  // Fungsi untuk agregasi data diagram (mirip dengan HasilView)
  const aggregateChartData = useCallback(() => {
    if (analysisResults.length === 0) {
      setSentimentPieData(null);
      setTweetsPerDayBarData(null);
      return;
    }

    // 1. Data untuk Pie Chart Sentimen
    const sentimentCounts = {
      'Positif': 0,
      'Netral': 0,
      'Negatif': 0,
    };

    analysisResults.forEach(tweet => {
      if (tweet.sentiment === 'Positif') sentimentCounts.Positif++;
      else if (tweet.sentiment === 'Netral') sentimentCounts.Netral++;
      else if (tweet.sentiment === 'Negatif') sentimentCounts.Negatif++;
    });

    const filteredLabels = Object.keys(sentimentCounts).filter(key => (sentimentCounts as any)[key] > 0);
    const filteredData = filteredLabels.map(key => (sentimentCounts as any)[key]);
    const backgroundColors = filteredLabels.map(key => {
      if (key === 'Positif') return 'rgba(75, 192, 192, 0.6)';
      if (key === 'Netral') return 'rgba(255, 206, 86, 0.6)';
      if (key === 'Negatif') return 'rgba(255, 99, 132, 0.6)';
      return 'rgba(150, 150, 150, 0.6)';
    });
    const borderColors = filteredLabels.map(key => {
      if (key === 'Positif') return 'rgba(75, 192, 192, 1)';
      if (key === 'Netral') return 'rgba(255, 206, 86, 1)';
      if (key === 'Negatif') return 'rgba(255, 99, 132, 1)';
      return 'rgba(150, 150, 150, 1)';
    });

    setSentimentPieData({
      labels: filteredLabels,
      datasets: [
        {
          label: 'Jumlah Tweet',
          data: filteredData,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    });

    // 2. Data untuk Bar Chart Tweet per Hari
    const tweetsByDate: { [key: string]: { Positif: number; Netral: number; Negatif: number; } } = {};

    analysisResults.filter(t => t.sentiment && t.sentiment_analyzed_at).forEach(tweet => {
      const date = new Date(tweet.sentiment_analyzed_at as string);
      const dateKey = date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });

      if (!tweetsByDate[dateKey]) {
        tweetsByDate[dateKey] = { Positif: 0, Netral: 0, Negatif: 0 };
      }
      if (tweet.sentiment === 'Positif') tweetsByDate[dateKey].Positif++;
      else if (tweet.sentiment === 'Netral') tweetsByDate[dateKey].Netral++;
      else if (tweet.sentiment === 'Negatif') tweetsByDate[dateKey].Negatif++;
    });

    const sortedDates = Object.keys(tweetsByDate).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA.getTime() - dateB.getTime();
    });

    setTweetsPerDayBarData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Positif',
          data: sortedDates.map(date => tweetsByDate[date].Positif),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Netral',
          data: sortedDates.map(date => tweetsByDate[date].Netral),
          backgroundColor: 'rgba(255, 206, 86, 0.8)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1,
        },
        {
          label: 'Negatif',
          data: sortedDates.map(date => tweetsByDate[date].Negatif),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [analysisResults]);

  useEffect(() => {
    aggregateChartData();
  }, [analysisResults, aggregateChartData]);


  // Handle download PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!searchedKeyword) {
      setError('Silakan cari keyword terlebih dahulu.');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/public/download-analysis-pdf/${searchedKeyword}`, {
        responseType: 'blob', // Penting untuk mengunduh file
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Analisis_Sentimen_${searchedKeyword}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      if (axios.isAxiosError(err) && err.response) {
        const responseData = err.response.data; // Tangkap data respons

        // Pastikan responseData adalah Blob sebelum mencoba membacanya
        if (responseData instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              setError(`Gagal mengunduh PDF: ${errorData.error || 'Unknown error'}.`);
            } catch {
              // Fallback jika parsing JSON gagal, gunakan statusText
              setError(`Gagal mengunduh PDF: ${err.response?.statusText || 'Unknown error'}.`);
            }
          };
          reader.readAsText(responseData); // Gunakan variabel yang sudah divalidasi
        } else {
          // Jika responseData bukan Blob (misal: undefined atau JSON langsung), gunakan statusText
          setError(`Gagal mengunduh PDF: ${err.response?.statusText || 'Unknown error'}.`);
        }
      } else {
        setError('Terjadi kesalahan jaringan atau tak terduga saat mengunduh PDF.');
      }
    }
  }, [searchedKeyword]);

  // Handle download CSV
  const handleDownloadCsv = useCallback(async () => {
    if (!searchedKeyword) {
      setError('Silakan cari keyword terlebih dahulu.');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/public/download-raw-csv/${searchedKeyword}`, {
        responseType: 'blob', // Penting untuk mengunduh file
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Data_Tweet_Mentah_${searchedKeyword}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      if (axios.isAxiosError(err) && err.response) {
        const responseData = err.response.data; // Tangkap data respons

        // Pastikan responseData adalah Blob sebelum mencoba membacanya
        if (responseData instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              setError(`Gagal mengunduh CSV: ${errorData.error || 'Unknown error'}.`);
            } catch {
              // Fallback jika parsing JSON gagal, gunakan statusText
              setError(`Gagal mengunduh CSV: ${err.response?.statusText || 'Unknown error'}.`);
            }
          };
          reader.readAsText(responseData); // Gunakan variabel yang sudah divalidasi
        } else {
          // Jika responseData bukan Blob (misal: undefined atau JSON langsung), gunakan statusText
          setError(`Gagal mengunduh CSV: ${err.response?.statusText || 'Unknown error'}.`);
        }
      } else {
        setError('Terjadi kesalahan jaringan atau tak terduga saat mengunduh CSV.');
      }
    }
  }, [searchedKeyword]);


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8, flexGrow: 1 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
            Cari & Unduh Hasil Analisis Sentimen
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Masukkan kata kunci untuk melihat ringkasan analisis sentimen dan mengunduh data.
          </Typography>

          <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} alignItems="center">
            <TextField
              fullWidth
              label="Kata Kunci Analisis"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Contoh: kesehatan mental"
              disabled={loading}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              disabled={loading}
              sx={{ minWidth: { xs: '100%', sm: 150 } }}
            >
              {loading ? <CircularProgress size={24} /> : 'Cari Analisis'}
            </Button>
          </Stack>
        </Paper>

        {/* Menampilkan error umum dari pencarian */}
        {error && analysisResults.length === 0 && ( // Tampilkan error hanya jika tidak ada hasil
          <Alert severity="error" sx={{ my: 3 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Memuat hasil analisis...</Typography>
          </Box>
        )}

        {/* Bagian untuk menampilkan pesan "Tidak ada hasil" dan opsi request */}
        {!loading && analysisResults.length === 0 && searchedKeyword && !error && ( // Tambah !error agar tidak tumpang tindih
          <Alert severity="info" sx={{ my: 3, textAlign: 'left' }}>
            <Typography variant="body1">
              Tidak ada hasil analisis sentimen untuk keyword &quot;{searchedKeyword}&quot; yang ditemukan.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Anda bisa mencoba beberapa hal berikut:
              </Typography>
              <ul>
                <li><Typography variant="body2">Coba cari dengan kata kunci lain yang mungkin lebih umum atau relevan.</Typography></li>
                {/* FIX: Corrected malformed <li> tag structure */}
                <li>
                  <Typography variant="body2">Hasil analisis mungkin sedang diproses oleh admin. Silakan cek kembali nanti.</Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Jika Anda ingin data untuk kata kunci ini dianalisis, Anda dapat
                    <MuiLink component={RouterLink} to="/request-analysis" sx={{ ml: 0.5, mr: 0.5 }}>
                      mengajukan permintaan analisis baru
                    </MuiLink>
                    kepada admin.
                  </Typography>
                </li>
              </ul>
              <Button
                component={RouterLink}
                to="/request-analysis"
                variant="outlined"
                color="secondary"
                sx={{ mt: 2 }}
              >
                Ajukan Permintaan Analisis
              </Button>
            </Box>
          </Alert>
        )}

        {/* Bagian untuk menampilkan hasil analisis jika ada */}
        {!loading && analysisResults.length > 0 && searchedKeyword && (
          <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Hasil Analisis Sentimen untuk &quot;{searchedKeyword}&quot;
            </Typography>

            {/* Ringkasan Statistik */}
            {sentimentSummary && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, justifyContent: 'center' }}>
                <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'primary.main', color: 'common.white' }}>
                  <Typography variant="h6">{totalAnalyzed}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Total Dianalisis</Typography>
                </Card>
                <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'success.main', color: 'common.white' }}>
                  <Typography variant="h6">{sentimentSummary.Positif}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Positif</Typography>
                </Card>
                <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'warning.main', color: 'common.white' }}>
                  <Typography variant="h6">{sentimentSummary.Netral}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Netral</Typography>
                </Card>
                <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'error.main', color: 'common.white' }}>
                  <Typography variant="h6">{sentimentSummary.Negatif}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Negatif</Typography>
                </Card>
              </Box>
            )}

            {/* Diagram */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                flexWrap: 'wrap',
                gap: (theme) => theme.spacing(2),
                justifyContent: 'center',
                alignItems: 'flex-start',
                mb: 4,
              }}
            >
              <Box
                sx={{
                  flex: '1 1 calc(50% - 8px)',
                  minWidth: { xs: '100%', md: 280 },
                  maxWidth: { xs: '100%', md: 'calc(50% - 8px)' },
                  height: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1.5,
                  boxShadow: 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Distribusi Sentimen</Typography>
                {sentimentPieData ? (
                  <Pie
                    data={sentimentPieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { font: { size: 10 } }
                        },
                        title: {
                          display: true,
                          text: `Proporsi Sentimen Tweet untuk &quot;${searchedKeyword}&quot;`,
                          font: { size: 12 }
                        },
                      },
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">Tidak ada data sentimen untuk ditampilkan.</Typography>
                )}
              </Box>
              <Box
                sx={{
                  flex: '1 1 calc(50% - 8px)',
                  minWidth: { xs: '100%', md: 280 },
                  maxWidth: { xs: '100%', md: 'calc(50% - 8px)' },
                  height: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1.5,
                  boxShadow: 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Tweet Dianalisis per Hari</Typography>
                {tweetsPerDayBarData && tweetsPerDayBarData.labels.length > 0 ? (
                  <Bar
                    data={tweetsPerDayBarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { font: { size: 10 } }
                        },
                        title: {
                          display: true,
                          text: `Jumlah Tweet Dianalisis per Tanggal untuk &quot;${searchedKeyword}&quot;`,
                          font: { size: 12 }
                        },
                      },
                      scales: {
                        x: { stacked: true, title: { display: true, text: 'Tanggal', font: { size: 10 } }, ticks: { font: { size: 9 } } },
                        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Jumlah Tweet', font: { size: 10 } }, ticks: { font: { size: 9 } } },
                      },
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">Tidak ada data tanggal sentimen untuk ditampilkan.</Typography>
                )}
              </Box>
            </Box>

            {/* Tombol Download */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleDownloadPdf}
                disabled={loading || !searchedKeyword || analysisResults.length === 0} // Disable jika tidak ada hasil
              >
                Download Laporan Analisis (PDF)
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleDownloadCsv}
                disabled={loading || !searchedKeyword || analysisResults.length === 0} // Disable jika tidak ada hasil
              >
                Download Data Mentah (CSV)
              </Button>
            </Stack>

            {/* Tabel Detail Tweet */}
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              Detail Tweet Analisis
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <Table stickyHeader sx={{ minWidth: 650 }} aria-label="public analysis tweets table">
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Teks Tweet</TableCell>
                    <TableCell>Keyword</TableCell> {/* Tambahkan kembali Keyword di tabel publik */}
                    <TableCell>Likes</TableCell>
                    <TableCell>Retweets</TableCell>
                    <TableCell>Tanggal Dibuat</TableCell>
                    <TableCell>Sentimen</TableCell>
                    <TableCell>Dianalisis Pada</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysisResults.map((row, index) => (
                    <TableRow key={row.id_str}>
                      <TableCell>{index + 1}.</TableCell>
                      <TableCell>
                        {row.tweet_url ? (
                          <MuiLink href={row.tweet_url} target="_blank" rel="noopener noreferrer" title={row.full_text || row.tweet_url}>
                            {row.tweet_url.length > 30 ? `${row.tweet_url.substring(0, 30)}...` : row.tweet_url}
                          </MuiLink>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{row.username || 'N/A'}</TableCell>
                      <TableCell title={row.full_text || 'N/A'}>
                        {(row.full_text && row.full_text.length > 100) ? `${row.full_text.substring(0, 100)}...` : (row.full_text || 'N/A')}
                      </TableCell>
                      <TableCell>{row.keyword_used || 'N/A'}</TableCell> {/* Tampilkan Keyword */}
                      <TableCell>{(row.favorite_count ?? row.likes_count) ?? 'N/A'}</TableCell> {/* Cek kedua properti */}
                      <TableCell>{(row.retweet_count ?? row.retweets_count) ?? 'N/A'}</TableCell> {/* Cek kedua properti */}
                      <TableCell>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="subtitle2"
                          color={
                            row.sentiment === 'Positif' ? 'success.main' :
                            row.sentiment === 'Negatif' ? 'error.main' :
                            row.sentiment === 'Netral' ? 'warning.main' : 'text.secondary'
                          }
                        >
                          {row.sentiment || 'Belum Dianalisis'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.sentiment_analyzed_at ? new Date(row.sentiment_analyzed_at).toLocaleString('id-ID') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </Box>
  );
}

export default PublicAnalysisResultView;