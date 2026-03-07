import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/lib/auth/auth-context'
import { MainLayout } from '@/components/layout/main-layout'

const inter = Inter({ subsets: ['latin'] })

if (process.env.NODE_ENV !== 'production') {
  const required = ['STRIPE_SECRET_KEY', 'JWT_SECRET']
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`[env] missing ${key}`)
    }
  }
}

export const metadata: Metadata = {
  title: 'ForgePilot - Your AI Co-Founder for Launching Real Businesses',
  description: 'Go from idea to validated launch plan in under 10 minutes.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <MainLayout>{children}</MainLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
