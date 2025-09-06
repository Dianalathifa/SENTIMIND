import axios from 'axios';
import React, { useState, useCallback } from 'react';

import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from '@mui/material';

import Navbar from 'src/layouts/nav-home/nav-view'; // Sesuaikan jalur import Navbar Anda

export function PublicAnalysisRequestView() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmitRequest = useCallback(async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    if (!keyword.trim()) {
      setErrorMessage('Kata kunci tidak boleh kosong.');
      setLoading(false);
      return;
    }

    try {
      // !!! PENTING: Anda perlu membuat endpoint ini di backend Flask Anda.
      // Endpoint ini harus publik (tidak memerlukan JWT) dan menangani permintaan analisis.
      // Contoh: app.py atau routes/public_routes.py
      const response = await axios.post('http://localhost:5000/api/public/request-analysis', {
        keyword: keyword.trim(),
      });

      if (response.status === 200 || response.status === 201) {
        setSuccessMessage(response.data.message || 'Permintaan analisis berhasil diajukan! Hasil akan tersedia nanti.');
        setKeyword(''); // Bersihkan input setelah berhasil
      } else {
        setErrorMessage(response.data.error || 'Gagal mengajukan permintaan analisis.');
      }
    } catch (error: unknown) {
      console.error('Error submitting analysis request:', error);
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(`Terjadi kesalahan: ${error.response.data?.error || 'Unknown error'}.`);
      } else if (error instanceof Error) {
        setErrorMessage(`Terjadi kesalahan tak terduga: ${error.message}`);
      } else {
        setErrorMessage('Terjadi kesalahan jaringan atau tak terduga saat mengajukan permintaan.');
      }
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      <Container maxWidth="sm" sx={{ py: 8, flexGrow: 1 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
            Ajukan Permintaan Analisis Sentimen
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Masukkan kata kunci yang ingin Anda analisis sentimennya. Kami akan memproses permintaan Anda dan hasilnya akan tersedia di halaman publik nanti.
          </Typography>

          <Stack spacing={3}>
            {successMessage && <Alert severity="success">{successMessage}</Alert>}
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TextField
              fullWidth
              label="Kata Kunci Analisis"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Contoh: pendidikan, ekonomi, teknologi"
              disabled={loading}
            />

            <Button
              fullWidth
              size="large"
              variant="contained"
              color="primary"
              onClick={handleSubmitRequest}
              disabled={loading || !keyword.trim()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Mengirim Permintaan...' : 'Kirim Permintaan Analisis'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
