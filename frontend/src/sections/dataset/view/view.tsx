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

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TweetTableRow } from '../tweet-table-row';
import { TweetTableHead } from '../tweet-table-head'; // Pastikan TweetTableHead mengimpor Order dari src/types/table
import { TableNoData } from '../../user/table-no-data';
import { TweetTableToolbar } from '../tweet-table-toolbar';
import { TableEmptyRows } from '../../user/table-empty-rows';
import { emptyRows, applyFilter, getComparator } from '../utils';

// --- Type Definitions ---
export interface TweetProps {
  id: string;
  tweet: string;
  username: string;
  created_at: string; // Or Date if you convert it in frontend
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  photoUrl?: string; // If you want to display the tweet user's profile photo
  link?: string; // Link to the tweet
  // Add other relevant properties from your Tweet model here
}

// --- useTable Hook (MODIFIKASI PENTING DI SINI) ---
export function useTable<T extends { id: string }>(defaultOrderBy: keyof T | string = 'created_at') {
  const [page, setPage] = useState(0);
  // orderBy bisa menjadi `keyof T` karena kita akan selalu melakukan casting saat set
  const [orderBy, setOrderBy] = useState<keyof T>(defaultOrderBy as keyof T);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // ************* PERBAIKAN PENTING UNTUK ON_SORT *************
  // Parameter 'id' harus string karena berasal dari TableSortLabel
  const onSort = useCallback(
    (id: string) => { // UBAH INI DARI 'keyof T' MENJADI 'string'
      const isAsc = orderBy === (id as keyof T) && order === 'asc'; // Lakukan casting di sini
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id as keyof T); // Lakukan casting di sini
    },
    [order, orderBy]
  );
  // *********************************************************

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
    onSort, // onSort sekarang menerima `string`
    onSelectRow,
    onSelectAllRows,
    onChangePage,
    onChangeRowsPerPage,
    onResetPage,
  };
}

// --- TweetDatasetView Component ---
export function TweetDatasetView() {
  const table = useTable<TweetProps>('created_at');
  const router = useRouter();
  const [filterName, setFilterName] = useState('');
  const [tweets, setTweets] = useState<TweetProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTweets = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No access token found. Please log in.');
        }

        const response = await axios.get('http://localhost:5000/api/scraping/get-recent-tweets', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && Array.isArray(response.data.preview_data)) {
          const mappedTweets: TweetProps[] = response.data.preview_data.map((tweet: any) => ({
            id: tweet.id_str,
            tweet: tweet.full_text,
            username: tweet.username,
            created_at: tweet.created_at,
            likes_count: tweet.favorite_count,
            retweets_count: tweet.retweet_count,
            replies_count: tweet.reply_count,
            photoUrl: '/assets/images/avatars/avatar_default.jpg',
            link: tweet.tweet_url,
          }));
          setTweets(mappedTweets);
        } else {
          setError('Invalid data format. Expected an object with "preview_data" array.');
        }
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
          setError(err.response.data?.error || err.response.data?.message || 'Failed to load tweet data.');
          if (err.response.status === 401 || err.response.status === 403) {
            router.push('/sign-in');
          }
        } else {
          setError(err.message || 'Failed to load tweet data. Check your internet connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, [router]);

  const dataFiltered = applyFilter<TweetProps>({
    inputData: tweets,
    comparator: getComparator<TweetProps>(table.order, table.orderBy),
    filterName,
    filterKeys: ['username', 'tweet'],
  });

  const notFound = !dataFiltered.length && !!filterName;

  const handleNewScrapeClick = useCallback(() => {
    router.push('/scrape-new-data');
  }, [router]);

  const handleEditTweet = useCallback((id: string) => {
    console.log('Editing tweet with ID:', id);
  }, []);

  const handleDeleteSingleTweet = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tweet?')) {
      return;
    }
    console.log('Deleting tweet with ID:', id);
    setTweets((prevTweets) => prevTweets.filter((tweet) => tweet.id !== id));
    table.onSelectRow(id);
  }, [table]);

  const handleDeleteSelectedTweets = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete ${table.selected.length} selected tweets?`)) {
      return;
    }
    console.log('Deleting selected tweets:', table.selected);
    setTweets((prevTweets) => prevTweets.filter((tweet) => !table.selected.includes(tweet.id)));
    table.onSelectAllRows(false, []);
    table.onResetPage();
  }, [table]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Data Tweets
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleNewScrapeClick}
        >
          Run New Scrape
        </Button>
      </Box>

      <Card>
        <TweetTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
          onDeleteSelected={handleDeleteSelectedTweets}
        />

        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" mt={2}>Memuat data tweet...</Typography>
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
                  <TweetTableHead
                    order={table.order}
                    orderBy={table.orderBy as string}
                    rowCount={tweets.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort} // Ini sekarang seharusnya cocok karena table.onSort menerima string
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(checked, tweets.map((tweet) => tweet.id))
                    }
                    headLabel={[
                      { id: 'username', label: 'Username' },
                      { id: 'tweet', label: 'Tweet Content' },
                      { id: 'created_at', label: 'Date' },
                      { id: 'likes_count', label: 'Likes', align: 'center' },
                      { id: 'retweets_count', label: 'Retweets', align: 'center' },
                      { id: 'replies_count', label: 'Replies', align: 'center' },
                      { id: '', label: 'Actions' },
                    ]}
                  />
                  <TableBody>
                    {dataFiltered
                      .slice(
                        table.page * table.rowsPerPage,
                        table.page * table.rowsPerPage + table.rowsPerPage
                      )
                      .map((row) => (
                        <TweetTableRow
                          key={row.id}
                          row={row}
                          selected={table.selected.includes(row.id)}
                          onSelectRow={() => table.onSelectRow(row.id)}
                          onEditTweet={handleEditTweet}
                          onDeleteTweet={handleDeleteSingleTweet}
                        />
                      ))}

                    <TableEmptyRows
                      height={68}
                      emptyRows={emptyRows(table.page, table.rowsPerPage, tweets.length)}
                    />

                    {notFound && <TableNoData searchQuery={filterName} />}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <TablePagination
              component="div"
              page={table.page}
              count={tweets.length}
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