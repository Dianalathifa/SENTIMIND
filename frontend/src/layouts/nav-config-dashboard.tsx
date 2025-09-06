import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Admin',
    path: '/admin',
    icon: icon('ic-user'),
  },
  {
    title: 'Content',
    path: '/content',
    icon: icon('ic-blog'),
  },
  {
    title: 'Crawling',
    path: '/crawling',
    icon: icon('ic-search'),
    
  },
  {
    title: 'Dataset',
    path: '/dataset',
    icon: icon('ic-search'),
    
  },
  {
    title: 'Analisis',
    path: '/analisis',
    icon: icon('ic-search'),
    
  },
  {
    title: 'Hasil Analisis',
    path: '/hasil',
    icon: icon('ic-search'),
    
  },
  // {
  //   title: 'Sign in',
  //   path: '/sign-in',
  //   icon: icon('ic-lock'),
  // },
  // {
  //   title: 'Not found',
  //   path: '/404',
  //   icon: icon('ic-disabled'),
  // },
];
