import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination, // Tambahkan Pagination
  TextField, // Untuk search
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { IContentItem } from '../types';
import { ContentForm } from '../view/content-form';



export function ContentViewAdmin() {
  const router = useRouter();
  const [contentList, setContentList] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<IContentItem | undefined>(undefined);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Anda bisa mengubah ini sesuai kebutuhan
  
  // State untuk Search
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/sign-in');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/content', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        setContentList(response.data.content || []);
      } else {
        setError('Failed to load content: Server error occurred.');
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          setError('Session expired or invalid token. Please log in again.');
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        } else {
          setError(`Failed to load content: ${err.response.data?.error || 'Unknown error'}`);
        }
      } else {
        setError('Network error occurred while loading content.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleAddContent = () => {
    setSelectedContent(undefined);
    setOpenForm(true);
  };

  const handleEditContent = (content: IContentItem) => {
    setSelectedContent(content);
    setOpenForm(true);
  };

  const handleDeleteContent = (contentId: string) => {
    setContentToDelete(contentId);
    setOpenDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!contentToDelete) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('You are not logged in. Please log in.');
        router.push('/sign-in');
        setLoading(false);
        setOpenDeleteConfirm(false);
        return;
      }

      await axios.delete(`http://localhost:5000/api/content/${contentToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOpenDeleteConfirm(false);
      setContentToDelete(null);
      await fetchContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(`Failed to delete content: ${err.response.data?.error || 'Unknown error'}`);
      } else {
        setError('Network error occurred while deleting content.');
      }
      setLoading(false);
    }
  };

  const handleViewContent = (contentId: string) => {
    // Navigasi ke halaman detail konten di frontend publik
    router.push(`/blog/${contentId}`);
  };

  // Filter konten berdasarkan search term
  const filteredContent = useMemo(() => {
    if (!searchTerm) {
      return contentList;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return contentList.filter(content =>
      content.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      content.excerpt?.toLowerCase().includes(lowerCaseSearchTerm) ||
      content.status.toLowerCase().includes(lowerCaseSearchTerm) ||
      content.recommendation_text?.toLowerCase().includes(lowerCaseSearchTerm) ||
      // Perbaikan di sini: Pastikan content.tags adalah array sebelum memanggil .some()
      (Array.isArray(content.tags) && content.tags.some(tag => tag.tag_name.toLowerCase().includes(lowerCaseSearchTerm)))
    );
  }, [contentList, searchTerm]);

  // Logika Pagination
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredContent.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    // Opsional: gulir ke atas tabel saat halaman berubah
    const tableContainer = document.getElementById('content-table-container');
    if (tableContainer) {
      tableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4">Content Analysis Management</Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleAddContent}
        >
          New content
        </Button>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        label="Cari Konten (Judul, Ringkasan, Status, Rekomendasi, Tags)"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1); // Reset halaman ke 1 saat mencari
        }}
        variant="outlined"
        size="small"
        sx={{ mb: 3 }}
      />

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          {/* FIX: Escaped ellipsis and removed unnecessary quotes if any */}
          <Typography variant="body1" sx={{ ml: 2, mt: 2 }}>Loading content list&hellip;</Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ my: 3 }}>
          {error}
        </Alert>
      )}

      {/* Message if No Content */}
      {!loading && !error && filteredContent.length === 0 && searchTerm === '' && (
        <Alert severity="info" sx={{ my: 3 }}>
          No analysis content available yet. Add a new one!
        </Alert>
      )}
      {!loading && !error && filteredContent.length === 0 && searchTerm !== '' && (
        <Alert severity="info" sx={{ my: 3 }}>
          No content found matching &quot;{searchTerm}&quot;. {/* FIX: Escaped double quotes */}
        </Alert>
      )}

      {/* Content List Table */}
      {!loading && !error && filteredContent.length > 0 && (
        <Card sx={{ p: 3 }}>
          <TableContainer component={Paper} sx={{ maxHeight: 600, overflowY: 'auto' }} id="content-table-container">
            <Table stickyHeader aria-label="content management table">
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Author (Admin ID)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell>Shares</TableCell>
                  <TableCell>Published At</TableCell>
                  <TableCell>Tags</TableCell> {/* Tambahkan kolom Tags */}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentItems.map((content, index) => ( // Gunakan currentItems untuk pagination
                  <TableRow key={content.id}>
                    <TableCell>{indexOfFirstItem + index + 1}.</TableCell> {/* Nomor urut yang benar */}
                    <TableCell>
                      <Typography variant="subtitle2" component="div" title={content.title}>
                        {content.title.length > 50 ? `${content.title.substring(0, 50)}...` : content.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{content.author_admin_id}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          content.status === 'published' ? 'success.main' :
                          content.status === 'draft' ? 'warning.main' : 'text.secondary'
                        }
                      >
                        {content.status}
                      </Typography>
                    </TableCell>
                    <TableCell>{content.views_count}</TableCell>
                    <TableCell>{content.comments_count}</TableCell>
                    <TableCell>{content.shares_count}</TableCell>
                    <TableCell>
                      {content.published_at ? new Date(content.published_at).toLocaleDateString('id-ID') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {/* Perbaikan di sini: Pastikan content.tags adalah array sebelum memanggil .map() */}
                      {Array.isArray(content.tags) && content.tags.length > 0
                        ? content.tags.map(tag => tag.tag_name).join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleViewContent(content.id)} aria-label="view">
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEditContent(content)} aria-label="edit">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteContent(content.id)} aria-label="delete">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </Card>
      )}

      {/* Add/Edit Content Form */}
      <ContentForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSaveSuccess={fetchContent}
        content={selectedContent}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        {/* FIX: Removed unnecessary curly braces */}
        <DialogTitle id="alert-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Are you sure you want to delete this content? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}