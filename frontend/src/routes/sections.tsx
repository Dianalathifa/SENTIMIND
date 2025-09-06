// src/routes/routes.tsx
import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { KeywordOverviewView } from 'src/sections/hasil/KeywordOverviewView';

import RequireAuth from './require-auth';

// Lazy load pages
export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const ContentAdminPage = lazy(() => import('src/pages/content-admin'));
export const UserPage = lazy(() => import('src/pages/user'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const RegisterPage = lazy(() => import('src/pages/register'));
export const ProfilePage = lazy(() => import ('src/pages/profile'));
export const ProductsPage = lazy(() => import('src/pages/crawling'));
export const HomePage = lazy(() => import('src/pages/home'));
export const AboutPage = lazy(() => import('src/pages/about'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const CrawlingPage = lazy(() => import('src/pages/crawling'));
export const CrawlingUserPage = lazy(() => import('src/pages/crawling-user'));
export const DatasetPage = lazy(() => import('src/pages/dataset'));
export const AnalisisPage = lazy(() => import('src/pages/analisis'));
export const PublicAnalysisRequestPage = lazy(() => import('src/pages/public'));
export const PublicRequestAdminPage = lazy(() => import('src/pages/public-admin'));
export const PublicResultPage = lazy(() => import('src/pages/pubic-result'));
export const HasilPage = lazy(() => import('src/pages/hasil'));
export const KeywordPage = lazy(() => import('src/pages/hasil'));
export const ContentPage = lazy(() => import('src/pages/content'));
export const ContentDetailPage = lazy(() => import('src/pages/content-detail'));

// Fallback loading UI
const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

// Routing definition
export const routesSection: RouteObject[] = [
  {
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </RequireAuth>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'admin', element: <UserPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'crawling', element: <CrawlingPage /> },
      { path: 'request', element: <PublicRequestAdminPage /> },
      { path: 'dataset', element: <DatasetPage /> },
      { path: 'analisis', element: <AnalisisPage /> },
      { path: 'hasil', element: <HasilPage /> },
      { path: 'keyword', element: <KeywordPage /> },
      { path: 'content', element: <ContentAdminPage /> },
      { path: 'profile', element: <ProfilePage /> },

    ],
  },
  {
    index: true,
    element: <HomePage />,
  },
  {
    path: 'about',
    element: <AboutPage />,
  },
  {
    path: 'crawling-userr',
    element: <CrawlingUserPage />,
  },
  {
    path: 'request-analysis',
    element: <PublicAnalysisRequestPage />,
  },
  {
    path: 'crawling-user',
    element: <PublicResultPage />,
  },
  {
    path: 'content-user',
    element: <ContentPage />,
  },
  {
    path: 'content-detail/:id',
    element: <ContentDetailPage />,
  },
  {
    path: 'Keyword',
    element: <KeywordPage />,
  },
  {
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: 'register',
    element: (
      <AuthLayout>
        <Suspense fallback={renderFallback()}>
          <RegisterPage />
        </Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
  },
  {
    path: '*',
    element: <Page404 />,
  },
];