import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom'; // Import Link dari react-router-dom dengan alias RouterLink
import React, { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link, // Link dari @mui/material
  Button,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard'; // Asumsi layout dashboard Anda

// Interface untuk data permintaan analisis publik
interface PublicAnalysisRequestItem {
  id: string;
  keyword: string;
  requested_at: string; // ISO string
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_by_admin_id: number | null;
  processed_by_admin_username?: string | null; // Ditambahkan dari backend join
  result_content_id: string | null;
  result_content_title?: string | null; // Ditambahkan dari backend join
}

export function PublicRequestAdminView() {
  const router = useRouter();
  const [requests, setRequests] = useState<PublicAnalysisRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // State untuk pesan sukses
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null); // State untuk melacak permintaan yang sedang diproses
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // BARU: State untuk pesan status sementara

  const fetchPublicRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null); // Bersihkan pesan sukses saat memuat ulang
    setStatusMessage(null); // Bersihkan pesan status saat memuat ulang
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Anda belum login atau sesi telah berakhir. Silakan login.');
        router.push('/sign-in');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/public/admin/analysis-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        setRequests(response.data.requests || []);
      } else {
        setError('Gagal memuat daftar permintaan: Terjadi kesalahan server.');
      }
    } catch (err) {
      console.error('Error fetching public analysis requests:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          setError('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setError(`Gagal memuat daftar permintaan: ${err.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setError('Terjadi kesalahan jaringan saat memuat daftar permintaan.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Handle proses permintaan
  const handleProcessRequest = useCallback(async (requestId: string, keyword: string) => {
    setProcessingRequestId(requestId); // Set ID permintaan yang sedang diproses
    setError(null); // Bersihkan pesan error sebelumnya
    setSuccessMessage(null); // Bersihkan pesan sukses sebelumnya
    setStatusMessage(`Memproses permintaan untuk "${keyword}"... Ini mungkin memakan waktu.`); // BARU: Set pesan status

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Anda belum login atau sesi telah berakhir. Silakan login.');
        router.push('/sign-in');
        setProcessingRequestId(null);
        setStatusMessage(null); // Bersihkan pesan status
        return;
      }

      const response = await axios.post(`http://localhost:5000/api/public/admin/analysis-requests/${requestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 1200000, // Timeout 20 menit (1200 detik)
      });

      if (response.status === 200) {
        setSuccessMessage(response.data.message || 'Permintaan berhasil diproses.');
        setStatusMessage(null); // Bersihkan pesan status setelah sukses
        await fetchPublicRequests(); // Muat ulang daftar setelah berhasil
      } else {
        setError(response.data.error || 'Gagal memproses permintaan.');
        setStatusMessage(null); // Bersihkan pesan status setelah error
      }
    } catch (err) {
      console.error('Error processing request:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          setError('Sesi berakhir atau token tidak valid. Silakan login kembali.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setError(`Gagal memproses permintaan: ${err.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setError('Terjadi kesalahan jaringan atau tak terduga saat memproses permintaan.');
      }
      setStatusMessage(null); // Bersihkan pesan status setelah error
    } finally {
      setProcessingRequestId(null); // Reset ID permintaan yang sedang diproses
    }
  }, [router, fetchPublicRequests]);


  useEffect(() => {
    fetchPublicRequests();
  }, [fetchPublicRequests]);

  // Fungsi untuk mendapatkan warna status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning.main';
      case 'processing': return 'info.main';
      case 'completed': return 'success.main';
      case 'failed': return 'error.main';
      default: return 'text.secondary';
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Daftar Permintaan Analisis Publik</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Tinjau permintaan analisis sentimen yang diajukan oleh pengunjung.
        </Typography>
      </Box>

      {/* BARU: Tampilkan pesan status sementara */}
      {statusMessage && (
        <Alert severity="info" sx={{ my: 3 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} /> {statusMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 3 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ my: 3 }}>
          {successMessage}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Memuat permintaan...</Typography>
        </Box>
      )}

      {!loading && !error && requests.length === 0 && (
        <Alert severity="info" sx={{ my: 3 }}>
          Tidak ada permintaan analisis publik yang ditemukan.
        </Alert>
      )}

      {!loading && !error && requests.length > 0 && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="public analysis requests table">
            <TableHead>
              <TableRow>
                <TableCell>No.</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Diajukan Pada</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Diproses Oleh Admin</TableCell>
                <TableCell>Hasil Konten</TableCell>
                <TableCell>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}.</TableCell>
                  <TableCell>{row.keyword}</TableCell>
                  <TableCell>{new Date(row.requested_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" color={getStatusColor(row.status)}>
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.processed_by_admin_username || 'Belum Diproses'}</TableCell>
                  <TableCell>
                    {row.result_content_id ? (
                      <Link component={RouterLink} to={`/dashboard/content-management/edit/${row.result_content_id}`} target="_blank" rel="noopener noreferrer">
                        {row.result_content_title || 'Lihat Konten'}
                      </Link>
                    ) : 'Belum Tersedia'}
                  </TableCell>
                  <TableCell>
                    {row.status === 'pending' && (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => handleProcessRequest(row.id, row.keyword)} // Teruskan keyword
                        disabled={processingRequestId === row.id} // Disable jika sedang diproses
                      >
                        {processingRequestId === row.id ? <CircularProgress size={20} /> : 'Proses'}
                      </Button>
                    )}
                    {/* Anda bisa menambahkan tombol lain seperti "Lihat Log" untuk status failed/completed */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DashboardContent>
  );
}
