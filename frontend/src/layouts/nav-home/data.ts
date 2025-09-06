import { IconType } from 'react-icons';
import { FaTwitter, FaFacebook, FaLinkedin } from 'react-icons/fa';

export const links = [
  { id: 1, url: '/', text: 'home' },
  { id: 2, url: '/crawling-user', text: 'crawling' },
  { id: 3, url: '/content-user', text: 'sentimind' },
  { id: 4, url: '/about', text: 'about' },
];

// Simpan icon sebagai komponen type IconType (bukan JSX)
export const social: { id: number; url: string; icon: IconType }[] = [
  { id: 1, url: 'https://twitter.com', icon: FaTwitter },
  { id: 2, url: 'https://facebook.com', icon: FaFacebook },
  { id: 3, url: 'https://linkedin.com', icon: FaLinkedin },
];
