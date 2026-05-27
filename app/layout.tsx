// Root layout - server component
// BUG: imports client-only library at module level in server component
// This causes hydration issues in production

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// BUG: Toaster is a client component being imported in server component
// Works in dev, causes issues in some production builds
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Choji - Team Collaboration',
  description: 'The modern workspace for high-performance teams',
  // BUG: og:image references file that doesn't exist
  openGraph: {
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* BUG: no suppressHydrationWarning - dark mode class manipulation causes hydration mismatch */}
      <head>
        {/* BUG: Google Fonts link duplicated - Inter is loaded via next/font above AND here */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* TODO: add favicon */}
      </head>
      <body className={inter.className}>
        {children}
        {/* BUG: Toaster in server component - will error in strict environments */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
            },
          }}
        />
      </body>
    </html>
  )
}
