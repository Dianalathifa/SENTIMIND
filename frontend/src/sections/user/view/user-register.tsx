import axios from 'axios'; // Impor axios untuk HTTP request
import { useState, useCallback } from 'react'; // Impor React hooks

import { LoadingButton } from '@mui/lab'; // Impor LoadingButton dari @mui/lab
import { // Impor komponen Material-UI
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

import { Iconify } from 'src/components/iconify'; // Menggunakan path alias 'src/' untuk Iconify

export function RegisterView() { // Ubah nama fungsi ekspor menjadi UserRegisterView
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // --- Validasi Sisi Klien ---
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg('Semua kolom harus diisi.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password harus memiliki minimal 6 karakter.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password dan konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Format email tidak valid.');
      setLoading(false);
      return;
    }

    try {
      // Endpoint API registrasi admin Anda
      // Berdasarkan struktur backend Anda, endpoint registrasi admin mungkin ada di 'backend/admin/register.py'
      // jadi URL API-nya kemungkinan besar adalah 'http://localhost:5000/api/admin/register'
      const response = await axios.post('http://localhost:5000/api/admin/register', {
        username,
        email,
        password,
      });

      if (response.status === 201 || response.data.message) {
        setSuccessMsg(response.data.message || 'Registrasi admin berhasil! Silakan login.');
        setTimeout(() => {
          router.push('/sign-in');
        }, 2000);
      } else {
        setErrorMsg('Registrasi gagal. Coba lagi nanti.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.error || error.response.data?.message || 'Registrasi gagal';
        setErrorMsg(msg);
      } else {
        setErrorMsg('Terjadi kesalahan saat registrasi. Periksa koneksi internet Anda.');
      }
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, router]);

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
        <Typography variant="h5">Daftar Admin Baru</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Sudah punya akun?
          <Link variant="subtitle2" sx={{ ml: 0.5 }} href="/login">
            Sign in
          </Link>
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 3 }}
          error={!!errorMsg && !username}
          helperText={errorMsg && !username ? 'Username diperlukan.' : ''}
        />

        <TextField
          fullWidth
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 3 }}
          error={!!errorMsg && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
          helperText={errorMsg && (!email ? 'Email diperlukan.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email tidak valid.' : '')}
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
          error={!!errorMsg && password.length > 0 && password.length < 6}
          helperText={errorMsg && password.length > 0 && password.length < 6 ? 'Password minimal 6 karakter.' : ''}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                  <Iconify icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
          error={!!errorMsg && password !== confirmPassword}
          helperText={errorMsg && password !== confirmPassword ? 'Password tidak cocok.' : ''}
        />

        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          color="inherit"
          onClick={handleRegister}
          loading={loading}
          disabled={loading}
        >
          Daftar Sekarang
        </LoadingButton>
      </Box>

      {/* <Divider sx={{ my: 3, '&::before, &::after': { borderTopStyle: 'dashed' } }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'fontWeightMedium' }}>
          OR
        </Typography>
      </Divider> */}

      {/* <Box sx={{ gap: 1, display: 'flex', justifyContent: 'center' }}>
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