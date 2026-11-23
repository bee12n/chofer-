import './globals.css';
import { Sora, Manrope, JetBrains_Mono } from 'next/font/google';

const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-mono', display: 'swap' });

export const metadata = {
  title: 'Bitácora del Chofer',
  description: 'Vueltas, gasolina y medidor de cada camioneta.',
  appleWebApp: { capable: true, title: 'Bitácora', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#060D1A' },
    { media: '(prefers-color-scheme: light)', color: '#E6F0FA' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
