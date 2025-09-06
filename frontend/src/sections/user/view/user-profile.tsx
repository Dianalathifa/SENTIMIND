// D:\Diana\SEMESTER 6\SENTIMIND2\frontend\src\sections\user\view\user-profile.tsx

import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Avatar,
  Typography,
  CircularProgress,
  Button, // Jika nanti ada tombol edit
  Stack, // Untuk penataan elemen
  Alert, // Untuk pesan error/informasi
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard'; // Pastikan path ini benar
import { getCurrentUserFromLocalStorage } from 'src/services/auth'; // Untuk mendapatkan data user

// Definisikan tipe untuk data pengguna yang akan disimpan/diambil
interface CurrentUser {
  admin_id: number;
  username: string;
  email: string;
  photoURL?: string; // Tambahkan jika Anda memiliki URL foto profil dari backend
}

export function ProfileView() { // Ubah nama fungsi ekspor di sini
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = () => {
      setLoading(true);
      setError(null);
      try {
        const user = getCurrentUserFromLocalStorage();
        if (user) {
          setCurrentUser(user);
        } else {
          setError('Tidak ada data pengguna yang ditemukan. Silakan login kembali.');
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat profil pengguna.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">Profil Admin</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
          <Typography variant="body2" ml={2}>Memuat profil...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : currentUser ? (
        <Card sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          <Stack spacing={3} alignItems="center">
            <Avatar
              src={currentUser.photoURL || '/assets/images/avatars/avatar_default.jpg'}
              alt={currentUser.username || 'User'}
              sx={{ width: 120, height: 120, mb: 2 }}
            >
              {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : ''}
            </Avatar>

            <Typography variant="h5" gutterBottom>
              {currentUser.username}
            </Typography>

            <Typography variant="body1" color="text.secondary">
              Email: {currentUser.email}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Role: Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {currentUser.admin_id}
            </Typography>

            {/* <Button variant="outlined" sx={{ mt: 3 }}>
              Edit Profil
            </Button> */}
          </Stack>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Alert severity="info">Tidak ada data profil untuk ditampilkan.</Alert>
        </Box>
      )}
    </DashboardContent>
  );
}