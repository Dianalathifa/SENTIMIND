import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useCallback, useEffect } from 'react'; // Impor React hooks di baris teratas

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { useRouter, usePathname } from 'src/routes/hooks';

import { _account } from 'src/layouts/nav-config-account'; // Menggunakan path alias 'src/'
import { getCurrentUserFromLocalStorage, logoutUser } from 'src/services/auth';

import { Iconify } from 'src/components/iconify';


interface CurrentUser {
  admin_id: number;
  username: string;
  email: string;
  photoURL?: string; // Tambahkan jika Anda memiliki URL foto profil dari backend
}

export type AccountPopoverProps = IconButtonProps & {
  // Properti 'data' untuk item navigasi (seperti Home, Profile, Settings)
  // Defaultnya adalah _account yang diimpor jika tidak diberikan
  data: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountPopover({ data = _account, sx, ...other }: AccountPopoverProps) { // Set default untuk data
  const router = useRouter();
  const pathname = usePathname();

  // --- State untuk data pengguna yang sedang login ---
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // --- Ambil data pengguna dari localStorage saat komponen dimuat ---
  useEffect(() => {
    const user = getCurrentUserFromLocalStorage();
    if (user) {
      setCurrentUser(user);
    }
  }, []); // [] agar hanya dijalankan sekali saat mount

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleClosePopover();
      router.push(path);
    },
    [handleClosePopover, router]
  );

  // --- Fungsi untuk menangani proses logout ---
  const handleLogout = useCallback(() => {
    logoutUser(); // Panggil fungsi logout dari service
    setCurrentUser(null); // Bersihkan state currentUser di komponen ini
    handleClosePopover(); // Tutup popover
    router.push('/sign-in'); // Arahkan pengguna ke halaman login
  }, [handleClosePopover, router]);

  return (
    <>
      <IconButton
        onClick={handleOpenPopover}
        sx={{
          p: '2px',
          width: 40,
          height: 40,
          background: (theme) =>
            `conic-gradient(${theme.vars.palette.primary.light}, ${theme.vars.palette.warning.light}, ${theme.vars.palette.primary.light})`,
          ...sx,
        }}
        {...other}
      >
        {/* Gunakan currentUser untuk Avatar */}
        <Avatar src={currentUser?.photoURL} alt={currentUser?.username || ''} sx={{ width: 1, height: 1 }}>
          {/* Tampilkan inisial jika username tersedia */}
          {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : ''}
        </Avatar>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 200 },
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          {/* Tampilkan username dinamis dari currentUser */}
          <Typography variant="subtitle2" noWrap>
            {currentUser?.username || 'Guest'}
          </Typography>

          {/* Tampilkan email dinamis dari currentUser */}
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {currentUser?.email || 'guest@example.com'}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuList
          disablePadding
          sx={{
            p: 1,
            gap: 0.5,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              [`&.${menuItemClasses.selected}`]: {
                color: 'text.primary',
                bgcolor: 'action.selected',
                fontWeight: 'fontWeightSemiBold',
              },
            },
          }}
        >
          {data.map((option) => (
            <MenuItem
              key={option.label}
              selected={option.href === pathname}
              onClick={() => handleClickItem(option.href)}
            >
              {option.icon}
              {option.label}
            </MenuItem>
          ))}
        </MenuList>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            color="error"
            size="medium"
            variant="text"
            onClick={handleLogout} // Panggil fungsi handleLogout yang sudah didefinisikan
          >
            Logout
          </Button>
        </Box>
      </Popover>
    </>
  );
}