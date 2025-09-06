import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { useLocation } from 'react-router-dom';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  MenuItem,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

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
  keyword_used?: string; // <--- PASTIKAN INI ADA DI DATA BACKEND ANDA

  // Field khusus untuk analisis sentimen
  sentiment?: string | null;
  sentiment_analyzed_at?: string | null;
}

export function HasilView() {
  const router = useRouter();
  const location = useLocation(); // Gunakan useLocation untuk mengakses state
  const [recentTweetsLoading, setRecentTweetsLoading] = useState(false);
  const [recentTweets, setRecentTweets] = useState<AnalyzedTweet[]>([]);
  const [limitFetch, setLimitFetch] = useState<number | ''>(100);

  // State untuk pencarian tabel
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ambil keyword dari state location
  const initialKeywordFilter = (location.state as { selectedKeyword?: string })?.selectedKeyword || 'Semua Keyword';
  const [keywordFilter, setKeywordFilter] = useState<string>(initialKeywordFilter);
  
  const [availableKeywords, setAvailableKeywords] = useState<string[]>(['Semua Keyword']);

  const [sentimentPieData, setSentimentPieData] = useState<any>(null);
  const [tweetsPerDayBarData, setTweetsPerDayBarData] = useState<any>(null);

  // Filter tweets berdasarkan keyword yang dipilih DAN search term
  const filteredTweets = useMemo(() => {
    let currentFilteredTweets = recentTweets;

    // Filter berdasarkan keyword (jika bukan 'Semua Keyword')
    if (keywordFilter !== 'Semua Keyword') {
      currentFilteredTweets = currentFilteredTweets.filter(tweet => tweet.keyword_used === keywordFilter);
    }

    // Filter berdasarkan search term (jika ada)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentFilteredTweets = currentFilteredTweets.filter(tweet =>
        (tweet.full_text?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (tweet.username?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (tweet.keyword_used?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (tweet.hashtags?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (tweet.mentions?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    return currentFilteredTweets;
  }, [recentTweets, keywordFilter, searchTerm]); // Tambahkan searchTerm sebagai dependensi

  // Fungsi untuk memuat tweet terbaru dari database
  const fetchRecentTweetsFromDb = useCallback(async () => {
    setRecentTweetsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
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
        const fetchedTweets: AnalyzedTweet[] = response.data.preview_data || [];
        setRecentTweets(fetchedTweets);

        const uniqueKeywords = new Set<string>();
        fetchedTweets.forEach(tweet => {
          if (tweet.keyword_used) {
            uniqueKeywords.add(tweet.keyword_used);
          }
        });
        // Pastikan 'Semua Keyword' selalu ada di awal
        setAvailableKeywords(['Semua Keyword', ...Array.from(uniqueKeywords).sort()]);
      }
    } catch (error) {
      console.error('Error fetching recent tweets for sentiment analysis:', error);
      if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/sign-in');
      }
    } finally {
      setRecentTweetsLoading(false);
    }
  }, [router, limitFetch]);

  // Fungsi untuk agregasi data diagram (tetap sama)
  const aggregateChartData = useCallback(() => {
    if (filteredTweets.length === 0) {
      setSentimentPieData(null);
      setTweetsPerDayBarData(null);
      return;
    }

    // 1. Data untuk Pie Chart Sentimen
    const sentimentCounts = {
      'Positif': 0,
      'Netral': 0,
      'Negatif': 0,
      'Belum Dianalisis': 0,
    };

    filteredTweets.forEach(tweet => {
      if (tweet.sentiment === 'Positif') sentimentCounts.Positif++;
      else if (tweet.sentiment === 'Netral') sentimentCounts.Netral++;
      else if (tweet.sentiment === 'Negatif') sentimentCounts.Negatif++;
      else sentimentCounts['Belum Dianalisis']++;
    });

    const filteredLabels = Object.keys(sentimentCounts).filter(key => (sentimentCounts as any)[key] > 0);
    const filteredData = filteredLabels.map(key => (sentimentCounts as any)[key]);
    const backgroundColors = filteredLabels.map(key => {
      if (key === 'Positif') return 'rgba(75, 192, 192, 0.6)'; // Teal
      if (key === 'Netral') return 'rgba(255, 206, 86, 0.6)'; // Yellow
      if (key === 'Negatif') return 'rgba(255, 99, 132, 0.6)'; // Red
      return 'rgba(150, 150, 150, 0.6)'; // Grey (Belum Dianalisis)
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

    // 2. Data untuk Bar Chart Tweet per Hari (hanya yang sudah dianalisis)
    const tweetsByDate: { [key: string]: { Positif: number; Netral: number; Negatif: number; } } = {};

    filteredTweets.filter(t => t.sentiment && t.sentiment_analyzed_at).forEach(tweet => {
      const date = new Date(tweet.sentiment_analyzed_at as string);
      const dateKey = date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });

      if (!tweetsByDate[dateKey]) {
        tweetsByDate[dateKey] = { Positif: 0, Netral: 0, Negatif: 0 };
      }
      if (tweet.sentiment === 'Positif') tweetsByDate[dateKey].Positif++;
      else if (tweet.sentiment === 'Netral') tweetsByDate[dateKey].Netral++;
      else if (tweet.sentiment === 'Negatif') tweetsByDate[dateKey].Negatif++;
    });

    // Urutkan tanggal secara kronologis
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

  }, [filteredTweets]);

  // Panggil fungsi agregasi setiap kali filteredTweets berubah
  useEffect(() => {
    aggregateChartData();
  }, [filteredTweets, aggregateChartData]);

  // useEffect untuk memuat tweet terbaru saat komponen dimuat pertama kali
  useEffect(() => {
    fetchRecentTweetsFromDb();
  }, [fetchRecentTweetsFromDb]);

  // Hitung ringkasan statistik
  const totalTweetsFetched = recentTweets.length;
  const totalTweetsAnalyzed = filteredTweets.filter(t => t.sentiment).length;
  const positiveCount = filteredTweets.filter(t => t.sentiment === 'Positif').length;
  const neutralCount = filteredTweets.filter(t => t.sentiment === 'Netral').length;
  const negativeCount = filteredTweets.filter(t => t.sentiment === 'Negatif').length;


  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Dashboard Hasil Analisis Sentimen</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Tinjau ringkasan dan detail analisis sentimen dari data yang telah diproses.
        </Typography>
      </Box>

      {/* Bagian untuk memuat ulang data secara manual */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <TextField
            label="Jumlah Tweet Dimuat"
            type="number"
            value={limitFetch}
            onChange={(e) => setLimitFetch(Number(e.target.value) || '')}
            inputProps={{ min: 1 }}
            helperText="Jumlah tweet terbaru yang akan ditampilkan."
            size="small"
            sx={{ flexGrow: 1, maxWidth: 200 }}
          />
          <Button
            size="medium"
            variant="contained"
            color="primary"
            onClick={fetchRecentTweetsFromDb}
            disabled={recentTweetsLoading}
          >
            {recentTweetsLoading ? <CircularProgress size={20} /> : 'Muat Ulang Data'}
          </Button>
        </Stack>
      </Card>


      {recentTweetsLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2, mt: 2 }}>Memuat data analisis sentimen...</Typography>
        </Box>
      )}

      {/* --- Bagian Ringkasan dan Diagram --- */}
      {!recentTweetsLoading && recentTweets.length > 0 && (
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Ringkasan Analisis Sentimen
          </Typography>

          {/* Statistik Ringkasan dalam Card */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, justifyContent: 'center' }}>
            <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'info.light' }}>
              <Typography variant="h6" color="info.contrastText">{totalTweetsFetched}</Typography>
              <Typography variant="body2" color="info.contrastText" sx={{ fontSize: '0.75rem' }}>Total Tweet Dimuat</Typography>
            </Card>
            <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'primary.light' }}>
              <Typography variant="h6" color="primary.contrastText">{totalTweetsAnalyzed}</Typography>
              <Typography variant="body2" color="primary.contrastText" sx={{ fontSize: '0.75rem' }}>Total Dianalisis</Typography>
            </Card>
            <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'success.main' }}>
              <Typography variant="h6" color="common.white">{positiveCount}</Typography>
              <Typography variant="body2" color="common.white" sx={{ fontSize: '0.75rem' }}>Positif</Typography>
            </Card>
            <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'warning.main' }}>
              <Typography variant="h6" color="common.white">{neutralCount}</Typography>
              <Typography variant="body2" color="common.white" sx={{ fontSize: '0.75rem' }}>Netral</Typography>
            </Card>
            <Card sx={{ p: 1.5, flex: '1 1 calc(33% - 8px)', minWidth: 120, textAlign: 'center', bgcolor: 'error.main' }}>
              <Typography variant="h6" color="common.white">{negativeCount}</Typography>
              <Typography variant="body2" color="common.white" sx={{ fontSize: '0.75rem' }}>Negatif</Typography>
            </Card>
          </Box>

          {/* Filter Keyword */}
          <TextField
            select
            fullWidth
            label="Filter Berdasarkan Keyword"
            value={keywordFilter}
            onChange={(e) => setKeywordFilter(e.target.value)}
            helperText="Pilih keyword untuk melihat analisis sentimen berdasarkan topik."
            sx={{ mb: 3 }}
            size="small"
          >
            {availableKeywords.map((keyword) => (
              <MenuItem key={keyword} value={keyword}>
                {keyword}
              </MenuItem>
            ))}
          </TextField>

          {filteredTweets.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                flexWrap: 'wrap',
                gap: (theme) => theme.spacing(2),
                justifyContent: 'center',
                alignItems: 'flex-start',
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
                          labels: {
                            font: {
                              size: 10
                            }
                          }
                        },
                        title: {
                          display: true,
                          text: `Proporsi Sentimen Tweet ${keywordFilter === 'Semua Keyword' ? '' : `untuk "${keywordFilter}"`}`,
                          font: {
                            size: 12
                          }
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
                          labels: {
                            font: {
                              size: 10
                            }
                          }
                        },
                        title: {
                          display: true,
                          text: `Jumlah Tweet Dianalisis per Tanggal ${keywordFilter === 'Semua Keyword' ? '' : `untuk "${keywordFilter}"`}`,
                          font: {
                            size: 12
                          }
                        },
                      },
                      scales: {
                        x: {
                          stacked: true,
                          title: {
                            display: true,
                            text: 'Tanggal',
                            font: {
                              size: 10
                            }
                          },
                          ticks: {
                            font: {
                              size: 9
                            }
                          }
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Jumlah Tweet',
                            font: {
                              size: 10
                            }
                          },
                          ticks: {
                            font: {
                              size: 9
                            }
                          }
                        },
                      },
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">Tidak ada data tanggal sentimen untuk ditampilkan.</Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Tidak ada tweet yang cocok dengan keyword &quot;{keywordFilter}&quot; untuk ditampilkan dalam grafik.
            </Alert>
          )}
        </Card>
      )}

      {/* Bagian Tabel Detail Tweet */}
      {!recentTweetsLoading && recentTweets.length > 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Detail Data Tweet Terbaru (Total {filteredTweets.length} Data)
          </Typography>
          {/* Search bar untuk tabel */}
          {/* <TextField
            fullWidth
            label="Cari di Tabel (Keyword, Teks Tweet, Username, Hashtag, Mention)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          /> */}
          <TableContainer component={Paper} sx={{ maxHeight: 500, overflowY: 'auto' }}>
            <Table stickyHeader sx={{ minWidth: 650 }} aria-label="recent tweets with sentiment table">
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Teks Tweet</TableCell>
                  <TableCell>Keyword</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Retweets</TableCell>
                  <TableCell>Tanggal Dibuat</TableCell>
                  <TableCell>Sentimen</TableCell>
                  <TableCell>Dianalisis Pada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTweets.map((row, index) => (
                  <TableRow key={row.id_str}>
                    <TableCell>{index + 1}.</TableCell>
                    <TableCell>
                      {row.tweet_url ? (
                        <Link href={row.tweet_url} target="_blank" rel="noopener noreferrer" title={row.full_text || row.tweet_url}>
                          {row.tweet_url.length > 30 ? `${row.tweet_url.substring(0, 30)}...` : row.tweet_url}
                        </Link>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{row.username || 'N/A'}</TableCell>
                    {/* Tambahkan title ke TableCell untuk teks tweet */}
                    <TableCell title={row.full_text || 'N/A'}>
                      {(row.full_text && row.full_text.length > 100) ? `${row.full_text.substring(0, 100)}...` : (row.full_text || 'N/A')}
                    </TableCell>
                    <TableCell>{row.keyword_used || 'N/A'}</TableCell>
                    <TableCell>{row.favorite_count ?? 'N/A'}</TableCell>
                    <TableCell>{row.retweet_count ?? 'N/A'}</TableCell>
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
        </Card>
      ) : (
        !recentTweetsLoading && recentTweets.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Tidak ada data tweet di database. Jalankan scraping dan analisis terlebih dahulu melalui backend.
          </Alert>
        )
      )}
    </DashboardContent>
  );
}
