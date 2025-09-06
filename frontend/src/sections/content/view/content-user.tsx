import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import {
  Box,
  Typography,
  Alert,
  Card,
  Pagination,
  Paper,
  Button,
  Container,
  CircularProgress,
} from '@mui/material';

const Iconify: React.FC<{ icon: string; sx?: any }> = ({ icon, sx }) => (
  <Box component="span" sx={{ ...sx }}>
    <img src={`https://api.iconify.design/${icon}.svg`} alt={icon} style={{ width: '24px', height: '24px' }} loading="lazy" />
  </Box>
);

import { IContentItem } from '../types';
import Navbar from '../../../layouts/nav-home/nav-view';


export interface IPostItem {
  id: string;
  coverUrl: string;
  title: string;
  createdAt: Date;
  view: number;
  comment: number;
  share: number;
  author: {
    name: string;
    avatarUrl: string;
  };
  tags: string[];
  content?: string;
  excerpt?: string;
}

const PostItem: React.FC<{ post: IPostItem; latestPostLarge?: boolean }> = ({
  post,
  latestPostLarge,
}) => (
  <RouterLink to={`/content-detail/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    <Paper
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 8,
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="img"
        src={post.coverUrl || '/assets/images/placeholder/placeholder_cover.jpg'}
        alt={post.title}
        sx={{
          width: '100%',
          height: latestPostLarge ? { xs: 220, md: 360 } : 220,
          objectFit: 'cover',
        }}
      />
      <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          {new Date(post.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
        <Typography
          variant={latestPostLarge ? 'h5' : 'h6'}
          component="h2"
          sx={{
            mb: 1.5,
            fontWeight: 700,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: latestPostLarge ? 3 : 2,
          }}
        >
          {post.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          mb: 2,
          flexGrow: 1,
          display: '-webkit-box',
          overflow: 'hidden',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: latestPostLarge ? 4 : 3,
        }}>
          {post.excerpt || 'Baca selengkapnya untuk menemukan wawasan menarik...'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {post.view} Views
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {post.comment} Comments
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="primary">
              Baca selengkapnya &rarr;
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  </RouterLink>
);

const PostSort: React.FC<{ sortBy: string; onSort: (newSort: string) => void; options: { value: string; label: string }[] }> = ({
  sortBy, onSort, options
}) => (
  <select value={sortBy} onChange={(e) => onSort(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const PostSearch: React.FC<{ posts: IPostItem[]; onSearch: (term: string) => void; searchTerm: string }> = ({ posts, onSearch, searchTerm }) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  };

  return (
    <input
      type="text"
      placeholder="Search post..."
      value={searchTerm}
      onChange={handleSearchChange}
      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
    />
  );
};

// ----------------------------------------------------------------------

export function ContentView() {
  const [sortBy, setSortBy] = useState('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchedContent, setFetchedContent] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/content');

      if (response.status === 200) {
        setFetchedContent(response.data.content || []);
      } else {
        setError('Failed to load content: Server error.');
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(`Failed to load content: ${err.response.data?.error || 'Unknown error'}`);
      } else {
        setError('Network error or unexpected issue while fetching content.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
    window.scrollTo(0, 0);
  }, [fetchContent]);

  const handleSort = useCallback((newSort: string) => {
    setSortBy(newSort);
  }, []);

  // Map IContentItem ke IPostItem dan terapkan pencarian
  const mappedAndFilteredPosts = useMemo(() => {
    const mapped = fetchedContent.map(content => ({
      id: content.id,
      coverUrl: content.cover_image_url || '/assets/images/placeholder/placeholder_blog_cover.jpg',
      title: content.title,
      createdAt: new Date(content.published_at || Date.now()),
      view: content.views_count || 0,
      comment: content.comments_count || 0,
      share: content.shares_count || 0,
      author: {
        name: content.author_username || `Admin ID: ${content.author_admin_id}`,
        avatarUrl: '/assets/images/avatars/avatar_default.jpg',
      },
      tags: content.tags ? content.tags.map((tag: { id: string; tag_name: string }) => tag.tag_name) : [],
      content: content.explanation_text,
      excerpt: content.excerpt,
    }));

    if (!searchTerm) {
      return mapped;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return mapped.filter(post =>
      post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.excerpt?.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.content?.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.author.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [fetchedContent, searchTerm]);

  // Urutkan post yang sudah difilter
  const sortedPosts = useMemo(
    () => [...mappedAndFilteredPosts].sort((a, b) => { // <--- PERHATIKAN PERUBAHAN DI SINI
      if (sortBy === 'latest') {
        // Asumsi 'createdAt' adalah objek Date atau memiliki metode getTime()
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (sortBy === 'oldest') {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      if (sortBy === 'popular') {
        // Asumsi 'view' adalah angka
        return b.view - a.view;
      }
      return 0;
    }), // <--- DAN PERHATIKAN PERUBAHAN DI SINI
    [mappedAndFilteredPosts, sortBy]
  );
  // Pagination logic (client-side for now)
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;
  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    return sortedPosts.slice(startIndex, endIndex);
  }, [sortedPosts, currentPage, postsPerPage]);

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* Hero Section Blog */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'primary.main',
          color: 'common.white',
          textAlign: 'center',
          mb: 5,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Wawasan Terbaru dari Sentitrend
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8 }}>
            Jelajahi artikel-artikel mendalam seputar analisis sentimen, web crawling, dan kecerdasan buatan.
          </Typography>
        </Container>
      </Box>

      {/* Bagian Tentang Analisis Sentimen */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
            Apa itu Analisis Sentimen?
          </Typography>
          <Typography variant="body1" paragraph>
            Analisis sentimen, atau opini mining, adalah bidang ilmu komputasi yang bertujuan untuk
            mengidentifikasi dan mengekstrak opini, sentimen, dan emosi dari teks. Ini melibatkan
            penggunaan teknik Natural Language Processing (NLP) dan machine learning untuk
            menganalisis data tekstual dari berbagai sumber seperti media sosial, ulasan produk,
            survei pelanggan, dan berita.
          </Typography>
          <Typography variant="body1" paragraph>
            Tujuan utamanya adalah untuk menentukan apakah suatu bagian teks memiliki polaritas
            positif, negatif, atau netral. Namun, analisis sentimen modern juga dapat
            mendeteksi emosi yang lebih spesifik (misalnya, marah, senang, sedih), niat
            (misalnya, membeli), dan bahkan aspek-aspek tertentu dari suatu topik.
          </Typography>
          <Typography variant="body1" paragraph>
            Dalam konteks bisnis, analisis sentimen sangat berharga untuk memahami
            persepsi publik terhadap merek, produk, atau layanan. Ini memungkinkan perusahaan
            untuk melacak reputasi, mengidentifikasi tren, merespons krisis dengan cepat, dan
            mengambil keputusan strategis berbasis data untuk meningkatkan kepuasan pelanggan
            dan keunggulan kompetitif.
          </Typography>
          <Button variant="outlined" color="primary" sx={{ mt: 2 }} component={RouterLink} to="/about-us#sentiment-section">
            Pelajari Lebih Lanjut Tentang Sentimen
          </Button>
        </Paper>
      </Container>


      <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            mb: 5,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Daftar Artikel
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <PostSearch posts={mappedAndFilteredPosts} onSearch={setSearchTerm} searchTerm={searchTerm} />
            <PostSort
              sortBy={sortBy}
              onSort={handleSort}
              options={[
                { value: 'latest', label: 'Terbaru' },
                { value: 'popular', label: 'Populer' },
                { value: 'oldest', label: 'Terlama' },
              ]}
            />
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Memuat artikel...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 3 }}>
            {error}
          </Alert>
        ) : paginatedPosts.length === 0 ? (
          <Alert severity="info" sx={{ my: 3 }}>
            Tidak ada artikel yang ditemukan.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: (theme) => theme.spacing(4),
              margin: (theme) => theme.spacing(-2),
              '& > *': {
                padding: (theme) => theme.spacing(2),
              },
            }}
          >
            {paginatedPosts.map((post, index) => {
              const latestPostLarge = currentPage === 1 && index === 0;

              const itemWidth = {
                xs: '100%',
                sm: latestPostLarge ? '100%' : 'calc(50% - 16px)',
                md: latestPostLarge ? 'calc(50% - 16px)' : 'calc(33.333% - 21.333px)',
                lg: latestPostLarge ? 'calc(50% - 16px)' : 'calc(33.333% - 21.333px)',
              };

              return (
                <Box
                  key={post.id}
                  sx={{
                    width: itemWidth,
                    flexGrow: 1,
                    flexShrink: 0,
                  }}
                >
                  <PostItem post={post} latestPostLarge={latestPostLarge} />
                </Box>
              );
            })}
          </Box>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, mb: 5 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default ContentView;
