import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { FeedbackWidget } from '@/components/ui/FeedbackWidget'
import { LanguageProvider } from '@/components/ui/LanguageProvider'

export const metadata: Metadata = {
  title: 'MEDIQ — Apprenez la médecine autrement',
  description: 'Apprenez ECG, dermatologie, biochimie et plus avec des cas cliniques réels.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MEDIQ',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider>
        {children}
        <FeedbackWidget />
        </LanguageProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {})
          }
        `}</Script>
      </body>
    </html>
  )
}
