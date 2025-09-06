import { useState, useCallback } from 'react';

import { LoadingButton } from '@mui/lab';
import {
  Box,
  Link,
  Stack,
  Alert,
  Button,
  Divider,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

// Import komponen kustom
import { loginUser } from 'src/services/auth';

import { Iconify } from 'src/components/iconify'; // Pastikan path ini benar


export function SignInView() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false); // State baru untuk indikator loading

  const handleSignIn = useCallback(async () => {
    setLoading(true); // Mulai loading
    setErrorMsg(''); // Reset pesan error sebelumnya

    try {
      // Panggil fungsi loginUser dari src/services/auth.ts
      // Fungsi ini sudah menangani pemanggilan API dan penyimpanan ke localStorage
      // loginUser menerima objek { username?: string; email?: string; password: string }
      // Sesuaikan `username: username` jika backend Anda menerima `email` sebagai field utama.
      await loginUser({ username, password });

      // Jika login berhasil, arahkan ke halaman utama dashboard
      router.push('/dashboard');
    } catch (error: any) { // Tangkap error dari fungsi loginUser
      console.error('Login failed in SignInView:', error);
      // loginUser sudah melemparkan Error dengan pesan yang relevan
      setErrorMsg(error.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false); // Hentikan loading
    }
  }, [username, password, router]);

  return (
    <>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 5,
        }}
      >
        <Typography variant="h5">Sign in</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Don’t have an account?
          <Link variant="subtitle2" sx={{ ml: 0.5 }} href="/register">
            Get started
          </Link>
        </Typography>
      </Box>

      {/* Tampilkan pesan error jika ada */}
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 3 }}
          // Tampilkan indikator error pada TextField jika ada errorMsg
          error={!!errorMsg}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
          // Tampilkan indikator error pada TextField jika ada errorMsg
          error={!!errorMsg}
        />

        {/* Gunakan LoadingButton untuk indikator loading */}
        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          color="inherit" // Sesuaikan warna jika perlu
          onClick={handleSignIn}
          loading={loading} // Kontrol loading state tombol
          disabled={loading} // Nonaktifkan tombol saat loading
        >
          Sign in
        </LoadingButton>
      </Box>

      {/* <Divider sx={{ my: 3, '&::before, &::after': { borderTopStyle: 'dashed' } }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'fontWeightMedium' }}>
          OR
        </Typography>
      </Divider>

      <Box sx={{ gap: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton color="inherit">
          <Iconify width={22} icon="socials:google" />
        </IconButton>
        <IconButton color="inherit">
          <Iconify width={22} icon="socials:github" />
        </IconButton>
        <IconButton color="inherit">
          <Iconify width={22} icon="socials:twitter" />
        </IconButton>
      </Box> */}

      <Stack alignItems="center" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <Link href="/" underline="hover">
            🔙 Go to Home
          </Link>
        </Typography>
      </Stack>
    </>
  );
}