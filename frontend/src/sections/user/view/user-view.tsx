import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Table,
  Button,
  Typography,
  TableBody,
  TableContainer,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks'; //

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../user-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { UserProps } from '../user-table-row';

export function UserView() {
  const table = useTable();
  const router = useRouter();
  const [filterName, setFilterName] = useState('');
  const [admins, setAdmins] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      setError(null);
      try {
        // Mendapatkan token dari localStorage
        const token = localStorage.getItem('accessToken'); 
        
        // Menambahkan header Authorization dengan token
        const response = await axios.get('http://localhost:5000/api/admin/all', {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
        if (Array.isArray(response.data)) {
          const mappedAdmins: UserProps[] = response.data.map((admin: any) => ({
            id: admin.id,
            username: admin.username,
            password: admin.password_hash?.slice(0, 10) + '...',
            name: admin.username,
            role: 'admin',
            company: 'Admin',
            avatarUrl: '/assets/images/avatars/avatar_default.jpg',
            photoUrl: '/assets/images/avatars/avatar_default.jpg',
            isVerified: true,
            status: 'active',
          }));
          setAdmins(mappedAdmins);
        } else {
          setError('Invalid data format');
        }
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
            setError(err.response.data?.message || 'Gagal memuat data. Periksa otentikasi.');
            if (err.response.status === 401) {
                router.push('/login');
            }
        } else {
            setError(err.message || 'Gagal memuat data. Periksa koneksi internet Anda.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [router]); // Tambahkan router ke dependency array useEffect

  const dataFiltered = applyFilter({
    inputData: admins,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  // Fungsi untuk menangani klik tombol "New admin"
  const handleNewAdminClick = useCallback(() => {
    // Arahkan ke halaman registrasi admin
    // Pastikan '/register-admin' adalah path yang benar yang Anda definisikan di routing Anda
    router.push('/register'); //
  }, [router]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Admins
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleNewAdminClick}
        >
          New admin
        </Button>
      </Box>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" mt={2}>Loading data...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="error" variant="body2">{error}</Typography>
          </Box>
        ) : (
          <>
            <Scrollbar>
              <TableContainer sx={{ overflow: 'unset' }}>
                <Table sx={{ minWidth: 800 }}>
                  <UserTableHead
                    order={table.order}
                    orderBy={table.orderBy}
                    rowCount={admins.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(checked, admins.map((admin) => admin.id))
                    }
                    headLabel={[
                      { id: 'photo', label: 'Photo' },
                      { id: 'username', label: 'Username' },
                      { id: 'password', label: 'Password' },
                      { id: 'isVerified', label: 'Verified', align: 'center' },
                      { id: 'status', label: 'Status' },
                    ]}
                  />
                  <TableBody>
                    {dataFiltered
                      .slice(
                        table.page * table.rowsPerPage,
                        table.page * table.rowsPerPage + table.rowsPerPage
                      )
                      .map((row) => (
                        <UserTableRow
                          key={row.id}
                          row={row}
                          selected={table.selected.includes(row.id)}
                          onSelectRow={() => table.onSelectRow(row.id)}
                        />
                      ))}

                    <TableEmptyRows
                      height={68}
                      emptyRows={emptyRows(table.page, table.rowsPerPage, admins.length)}
                    />

                    {notFound && <TableNoData searchQuery={filterName} />}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <TablePagination
              component="div"
              page={table.page}
              count={admins.length}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              rowsPerPageOptions={[5, 10, 25]}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </>
        )}
      </Card>
    </DashboardContent>
  );
}

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<'username' | string>('username');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    setSelected(checked ? newSelecteds : []);
  }, []);

  const onSelectRow = useCallback((id: string) => {
    setSelected((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((value) => value !== id)
        : [...prevSelected, id]
    );
  }, []);

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    onResetPage();
  }, [onResetPage]);

  return {
    page,
    order,
    orderBy,
    selected,
    rowsPerPage,
    onSort,
    onSelectRow,
    onSelectAllRows,
    onChangePage,
    onChangeRowsPerPage,
    onResetPage,
  };
}