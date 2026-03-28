import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AppProvider } from '@/lib/app-context';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'SINED Invest — Know what to buy next',
  description: 'Investment decision engine',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* SheetJS for XLSX reading in browser */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
          strategy="lazyOnload"
        />
        <I18nProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
