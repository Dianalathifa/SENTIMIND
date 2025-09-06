// src/sections/dataset/tweet-table-toolbar.tsx

import React from 'react'; // Impor React secara eksplisit

import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify'; // Pastikan path ini benar

// ----------------------------------------------------------------------

// Definisi antarmuka untuk props
interface TweetTableToolbarProps {
  numSelected: number;
  filterName: string;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteSelected?: () => void; // Menambahkan kembali prop onDeleteSelected
}

export function TweetTableToolbar({
  numSelected,
  filterName,
  onFilterName,
  onDeleteSelected, // Menerima prop onDeleteSelected
}: TweetTableToolbarProps) {
  return (
    <Toolbar
      sx={{
        height: 96,
        display: 'flex',
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <OutlinedInput
          fullWidth // Menambahkan fullWidth seperti di UserTableToolbar
          value={filterName}
          onChange={onFilterName}
          placeholder="Cari Tweet..." // Mengubah placeholder
          startAdornment={
            <InputAdornment position="start">
              {/* Gunakan 'icon={"" as any}' di sini */}
              <Iconify width={20} icon={"eva:search-fill" as any} sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: 320 }} // Mengatur maxWidth seperti di UserTableToolbar
        />
      )}

      {numSelected > 0 ? (
        <Tooltip title="Delete">
          <IconButton onClick={onDeleteSelected}> {/* Menambahkan onClick untuk onDeleteSelected */}
            {/* Gunakan 'icon={"" as any}' di sini */}
            <Iconify icon={"solar:trash-bin-trash-bold" as any} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Filter list">
          <IconButton>
            {/* Gunakan 'icon={"" as any}' di sini */}
            <Iconify icon={"ic:round-filter-list" as any} />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  );
}