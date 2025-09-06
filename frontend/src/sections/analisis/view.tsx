import axios from 'axios';
import { useState, useCallback, useEffect, useMemo } from 'react';

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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

interface AnalyzedTweet {
  id_str: string;
  tweet_url?: string;
  username?: string;
  full_text?: string;
  favorite_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  created_at?: string;
  user_id_str?: string;
  conversation_id_str?: string;
  location?: string;
  image_url?: string;
  hashtags?: string;
  mentions?: string;
  cashtags?: string;
  retweet?: boolean;
  video?: boolean;
  keyword_used?: string | null;
  // Field khusus untuk analisis sentimen
  sentiment?: string | null;
  sentiment_analyzed_at?: string | null;
}

export function AnalisisView() {
  const router = useRouter();
  const [recentTweetsLoading, setRecentTweetsLoading] = useState(false);
  const [recentTweets, setRecentTweets] = useState<AnalyzedTweet[]>([]);
  const [sentimentAnalysisLoading, setSentimentAnalysisLoading] = useState(false);
  const [sentimentAnalysisMessage, setSentimentAnalysisMessage] = useState('');
  const [sentimentAnalysisError, setSentimentAnalysisError] = useState('');
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);
  const [limitFetch, setLimitFetch] = useState<number | ''>(100);
  const [limitAnalyze, setLimitAnalyze] = useState<number | ''>(100);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');

  // --- State untuk Paginasi ---
  const [page, setPage] = useState(0); // Halaman saat ini (0-indexed)
  const [rowsPerPage, setRowsPerPage] = useState(10); // Jumlah baris per halaman

  // Fungsi untuk memuat tweet terbaru dari database
  const fetchRecentTweetsFromDb = useCallback(async (refreshAnalysisMessage = false) => {
    setRecentTweetsLoading(true);
    setSentimentAnalysisError('');
    if (refreshAnalysisMessage) {
      setSentimentAnalysisMessage('');
      setAnalyzedCount(0);
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setSentimentAnalysisError('Anda belum login. Silakan login.');
        router.push('/sign-in');
        setRecentTweetsLoading(false);
        return;
      }

      const actualLimitFetch = typeof limitFetch === 'number' && limitFetch > 0 ? limitFetch : 100;

      const response = await axios.get('http://localhost:5000/api/scraping/get-recent-tweets', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: actualLimitFetch }
      });

      if (response.status === 200) {
        setRecentTweets(response.data.preview_data || []);
        setPage(0); // Reset ke halaman pertama setiap kali data baru dimuat
        if (refreshAnalysisMessage) {
          setSentimentAnalysisMessage(response.data.message);
        }
      }
    } catch (error) {
      console.error('Error fetching recent tweets for sentiment analysis:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          setSentimentAnalysisError('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setSentimentAnalysisError(`Gagal memuat tweet: ${error.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setSentimentAnalysisError('Terjadi kesalahan saat memuat tweet terbaru untuk analisis.');
      }
    } finally {
      setRecentTweetsLoading(false);
    }
  }, [router, limitFetch]);

  // Fungsi untuk menjalankan analisis sentimen
  const handleAnalyzeSentiment = useCallback(async () => {
    setSentimentAnalysisLoading(true);
    setSentimentAnalysisMessage('');
    setSentimentAnalysisError('');
    setAnalyzedCount(0);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setSentimentAnalysisError('Anda belum login. Silakan login.');
        router.push('/sign-in');
        setSentimentAnalysisLoading(false);
        return;
      }

      const actualLimitAnalyze = typeof limitAnalyze === 'number' && limitAnalyze > 0 ? limitAnalyze : 100;

      const response = await axios.post('http://localhost:5000/api/scraping/analyze-sentiment', {
        limit: actualLimitAnalyze
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 600000
      });

      if (response.status === 200) {
        setSentimentAnalysisMessage(response.data.message || 'Analisis sentimen berhasil.');
        setAnalyzedCount(response.data.analyzed_count || 0);
        await fetchRecentTweetsFromDb(true);
      }
    } catch (error) {
      console.error('Error during sentiment analysis:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          setSentimentAnalysisError('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setSentimentAnalysisError(`Gagal menganalisis sentimen: ${error.response.data?.error || 'Unknown error'}.`);
        }
      } else {
        setSentimentAnalysisError('Terjadi kesalahan jaringan atau tak terduga saat analisis sentimen.');
      }
    } finally {
      setSentimentAnalysisLoading(false);
    }
  }, [router, limitAnalyze, fetchRecentTweetsFromDb]);

  // Handler untuk perubahan halaman paginasi
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Kembali ke halaman pertama saat rowsPerPage berubah
  }, []);

  useEffect(() => {
    fetchRecentTweetsFromDb();
  }, [fetchRecentTweetsFromDb]);

  // Mendapatkan daftar keyword unik dari tweet yang dimuat
  const uniqueKeywords = useMemo(() => {
    const keywords = new Set<string>();
    recentTweets.forEach(tweet => {
      if (tweet.keyword_used) {
        keywords.add(tweet.keyword_used);
      }
    });
    return Array.from(keywords).sort();
  }, [recentTweets]);

  // Filter tweet berdasarkan keyword yang dipilih
  const filteredTweets = useMemo(() => {
    if (!selectedKeyword) {
      return recentTweets;
    }
    return recentTweets.filter(tweet => tweet.keyword_used === selectedKeyword);
  }, [recentTweets, selectedKeyword]);

  // --- Logika Paginasi: Ambil data untuk halaman saat ini ---
  const paginatedTweets = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredTweets.slice(startIndex, endIndex);
  }, [filteredTweets, page, rowsPerPage]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Analisis Sentimen Data</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Muat tweet dari database dan jalankan analisis sentimen.
        </Typography>
      </Box>

      <Card sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          {sentimentAnalysisMessage && <Alert severity="success">{sentimentAnalysisMessage}</Alert>}
          {sentimentAnalysisError && <Alert severity="error">{sentimentAnalysisError}</Alert>}

          <TextField
            fullWidth
            label="Jumlah Tweet yang Akan Dimuat dari Database"
            type="number"
            value={limitFetch}
            onChange={(e) => setLimitFetch(Number(e.target.value) || '')}
            inputProps={{ min: 1 }}
            helperText="Jumlah tweet terbaru yang akan ditampilkan dari database."
          />

          <Button
            fullWidth
            size="large"
            variant="contained"
            color="primary"
            onClick={() => fetchRecentTweetsFromDb(true)}
            disabled={recentTweetsLoading || sentimentAnalysisLoading}
          >
            {recentTweetsLoading ? <CircularProgress size={24} /> : 'Muat Ulang Tweet Terbaru dari Database'}
          </Button>

          <TextField
            fullWidth
            label="Jumlah Tweet untuk Dianalisis Sentimen"
            type="number"
            value={limitAnalyze}
            onChange={(e) => setLimitAnalyze(Number(e.target.value) || '')}
            inputProps={{ min: 1 }}
            helperText="Jumlah tweet yang akan diproses sentimen (dari yang belum dianalisis)."
          />

          {recentTweets.length > 0 && (
            <LoadingButton
              fullWidth
              size="large"
              variant="contained"
              color="secondary"
              onClick={handleAnalyzeSentiment}
              loading={sentimentAnalysisLoading}
              disabled={sentimentAnalysisLoading || recentTweetsLoading || recentTweets.filter(t => !t.sentiment).length === 0}
            >
              Analisis Sentimen Tweet yang Belum Dianalisis ({recentTweets.filter(t => !t.sentiment).length} Tersisa)
            </LoadingButton>
          )}

          {analyzedCount > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Berhasil menganalisis {analyzedCount} tweet baru.
            </Alert>
          )}
        </Stack>
      </Card>

      {recentTweetsLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2, mt: 2 }}>Memuat tweet dari database...</Typography>
        </Box>
      )}

      {recentTweets && recentTweets.length > 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Data Tweet Terbaru dari Database (Total {filteredTweets.length} Data {selectedKeyword ? `untuk Keyword: "${selectedKeyword}"` : ''})
          </Typography>

          <FormControl fullWidth sx={{ mb: 3, maxWidth: 300 }}>
            <InputLabel id="keyword-select-label">Filter Keyword</InputLabel>
            <Select
              labelId="keyword-select-label"
              id="keyword-select"
              value={selectedKeyword}
              label="Filter Keyword"
              onChange={(e) => {
                setSelectedKeyword(e.target.value as string);
                setPage(0);
              }}
            >
              <MenuItem value="">
                <em>Semua Keyword</em>
              </MenuItem>
              {uniqueKeywords.map((keyword) => (
                <MenuItem key={keyword} value={keyword}>
                  {keyword}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="recent tweets with sentiment table">
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Keyword</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Teks Tweet</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Retweets</TableCell>
                  <TableCell>Tanggal Dibuat</TableCell>
                  <TableCell>Sentimen</TableCell>
                  <TableCell>Dianalisis Pada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTweets.map((row, index) => ( // <--- Gunakan paginatedTweets
                  <TableRow key={row.id_str}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell> {/* Perhitungan nomor urut */}
                    <TableCell>{row.keyword_used || 'N/A'}</TableCell>
                    <TableCell>
                      {row.tweet_url ? (
                        <Tooltip title={row.tweet_url} arrow>
                          <Link href={row.tweet_url} target="_blank" rel="noopener noreferrer">
                            {row.tweet_url.length > 30 ? `${row.tweet_url.substring(0, 30)}...` : row.tweet_url}
                          </Link>
                        </Tooltip>
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
                      {row.sentiment_analyzed_at ? new Date(row.sentiment_analyzed_at).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* --- TablePagination Component --- */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]} // Opsi jumlah baris per halaman
            component="div"
            count={filteredTweets.length} // Total baris setelah filter
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Baris per halaman:" // Label untuk opsi rows per page
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} dari ${count !== -1 ? count : `lebih dari ${to}`}`
            } // Custom label tampilan baris
          />
        </Card>
      ) : (
        !recentTweetsLoading && recentTweets.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Tidak ada data tweet di database. Jalankan scraping terlebih dahulu.
          </Alert>
        )
      )}
    </DashboardContent>
  );
}