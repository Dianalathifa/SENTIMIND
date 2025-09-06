import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { useParams } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
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
  Typography,
  Container,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Link,
} from '@mui/material';

import Navbar from 'src/layouts/nav-home/nav-view'; // Sesuaikan jalur import Navbar Anda

import { IContentItem, IVisualizationData } from '../types'; // Import IVisualizationData

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

export function ContentDetailView() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<IContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContentDetail = useCallback(async () => {
    if (!id) {
      setError('ID konten tidak ditemukan di URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5000/api/content/${id}`);

      if (response.status === 200) {
        setContent(response.data);
      } else {
        setError('Gagal memuat detail konten: Terjadi kesalahan server.');
      }
    } catch (err) {
      console.error('Error fetching content detail:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404) {
          setError('Konten tidak ditemukan atau tidak dipublikasikan.');
        } else {
          setError(`Gagal memuat detail konten: ${err.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setError('Terjadi kesalahan jaringan saat memuat detail konten.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContentDetail();
    window.scrollTo(0, 0);
  }, [fetchContentDetail]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center', flexGrow: 1 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Memuat detail konten...</Typography>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 8, flexGrow: 1 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 8, flexGrow: 1 }}>
          <Alert severity="info">Konten tidak tersedia.</Alert>
        </Container>
      </Box>
    );
  }

  // Helper untuk merender JSON dengan format yang rapi (tetap dipertahankan untuk debugging jika diperlukan)
  const renderJson = (jsonObj: any) => {
    if (!jsonObj) return null;
    return (
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', overflowX: 'auto', my: 2 }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <code>{JSON.stringify(jsonObj, null, 2)}</code>
        </pre>
      </Paper>
    );
  };

  // Fungsi untuk menyiapkan data chart
  const prepareChartData = (visualizationData: IVisualizationData) => {
    if (!visualizationData || !visualizationData.data || !visualizationData.chartType) {
      return null;
    }

    const { chartType, data, title } = visualizationData;

    const chartLabels = data.map((item) => item.label);
    const chartValues = data.map((item) => item.value);

    const backgroundColors = chartLabels.map((label: string) => {
      if (label === 'Positif') return 'rgba(75, 192, 192, 0.6)';
      if (label === 'Netral') return 'rgba(255, 206, 86, 0.6)';
      if (label === 'Negatif') return 'rgba(255, 99, 132, 0.6)';
      return 'rgba(150, 150, 150, 0.6)';
    });
    const borderColors = chartLabels.map((label: string) => {
      if (label === 'Positif') return 'rgba(75, 192, 192, 1)';
      if (label === 'Netral') return 'rgba(255, 206, 86, 1)';
      if (label === 'Negatif') return 'rgba(255, 99, 132, 1)';
      return 'rgba(150, 150, 150, 1)';
    });

    return {
      type: chartType,
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Jumlah',
            data: chartValues,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            // PERBAIKAN: Type assertion untuk property 'position'
            position: (chartType === 'pie' ? 'right' : 'top') as 'right' | 'top',
            labels: { font: { size: 10 } }
          },
          title: {
            display: true,
            text: title || 'Visualisasi Data',
            font: { size: 12 }
          },
        },
        scales: chartType === 'bar' ? {
          x: {
            title: { display: true, text: 'Kategori', font: { size: 10 } },
            ticks: { font: { size: 9 } }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Jumlah', font: { size: 10 } },
            ticks: { font: { size: 9 } }
          },
        } : {},
      },
    };
  };

  const chartConfig = content.visualization_data ? prepareChartData(content.visualization_data) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      <Box
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'primary.main',
          color: 'common.white',
          textAlign: 'center',
          mb: 5,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {content.title}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8 }}>
            {content.excerpt}
          </Typography>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.7 }}>
            Dipublikasikan pada {new Date(content.published_at || '').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' | '} Dilihat: {content.views_count} kali
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ flexGrow: 1, pb: 8 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
          {content.cover_image_url && (
            <Box
              component="img"
              src={content.cover_image_url}
              alt={content.title}
              sx={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 1,
                mb: 4,
              }}
            />
          )}

          {/* Bagian Penjelasan Konten */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, color: 'primary.dark' }}>
            Penjelasan Lengkap
          </Typography>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
            {content.explanation_text}
          </Typography>

          {/* Bagian Rekomendasi/Insight */}
          {content.recommendation_text && (
            <Box sx={{ mt: 4, mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, color: 'primary.dark' }}>
                Rekomendasi & Insight
              </Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {content.recommendation_text}
              </Typography>
            </Box>
          )}

          {/* Bagian Data Visualisasi (Grafik) */}
          {chartConfig && (
            <Box sx={{ mt: 4, mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, color: 'primary.dark' }}>
                Visualisasi Data
              </Typography>
              <Box sx={{ height: 300, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {chartConfig.type === 'pie' && <Pie data={chartConfig.data} options={chartConfig.options} />}
                {chartConfig.type === 'bar' && <Bar data={chartConfig.data} options={chartConfig.options} />}
                {(!chartConfig.type || (chartConfig.type !== 'pie' && chartConfig.type !== 'bar')) && (
                  <Typography variant="body2" color="text.secondary">Tipe grafik tidak didukung atau data tidak lengkap.</Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Bagian Tautan Terkait (JSON Array) */}
          {content.related_links && Array.isArray(content.related_links) && content.related_links.length > 0 && (
            <Box sx={{ mt: 4, mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, color: 'primary.dark' }}>
                Tautan Terkait
              </Typography>
              <Stack spacing={1}>
                {content.related_links.map((linkItem: any, index: number) => (
                  <Link
                    key={index}
                    href={linkItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body1"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      '& svg': { mr: 1 },
                    }}
                  >
                    {linkItem.title || linkItem.url}
                  </Link>
                ))}
              </Stack>
            </Box>
          )}

          {/* Bagian Tags */}
          {content.tags && content.tags.length > 0 && (
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" component="span" sx={{ mr: 1, fontWeight: 700 }}>
                Tags:
              </Typography>
              {content.tags.map((tag, index) => (
                <Typography key={tag.id} variant="body2" component="span" sx={{
                  bgcolor: 'primary.lighter',
                  color: 'primary.darker',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  mr: 1,
                  display: 'inline-block',
                }}>
                  {tag.tag_name}
                </Typography>
              ))}
            </Box>
          )}

          {/* Bagian Statistik Bawah */}
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Views: {content.views_count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comments: {content.comments_count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shares: {content.shares_count}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ContentDetailView;
