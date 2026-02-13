import { Metadata } from 'next'

type PageKey = 'home' | 'generator' | 'dashboard' | 'pricing' | 'admin'

const pageMetadata: Record<PageKey, Metadata> = {
  home: {
    title: 'ForgePilot - Launch Blueprint for New Businesses',
    description: 'Turn ideas into a revenue-ready launch blueprint with business validation, advanced branding, and verification evidence.',
    openGraph: {
      title: 'ForgePilot AI - Autonomous Branding Platform',
      description: 'Generate complete brand identities in minutes',
      type: 'website',
    },
  },
  generator: {
    title: 'Brand Generator - ForgePilot AI',
    description: 'Create your complete brand identity with AI-powered creativity. Generate logos, color palettes, typography, and more.',
    openGraph: {
      title: 'Brand Generator - ForgePilot AI',
      description: 'Create your complete brand identity with AI-powered creativity',
      type: 'website',
    },
  },
  dashboard: {
    title: 'Dashboard - ForgePilot AI',
    description: 'Manage your brands, view analytics, and access all your brand assets.',
    openGraph: {
      title: 'Dashboard - ForgePilot AI',
      description: 'Manage your brands and assets',
      type: 'website',
    },
  },
  pricing: {
    title: 'Pricing - ForgePilot Launch Blueprint',
    description: 'Single v1 offer: ForgePilot Launch Blueprint for $69/month with Stripe billing.',
    openGraph: {
      title: 'Pricing - ForgePilot AI',
      description: 'Choose the perfect plan for your branding needs',
      type: 'website',
    },
  },
  admin: {
    title: 'Admin Dashboard - ForgePilot AI',
    description: 'Administrative panel for managing users, metrics, and platform operations.',
    openGraph: {
      title: 'Admin Dashboard - ForgePilot AI',
      description: 'Administrative panel',
      type: 'website',
    },
  },
}

export function getPageMetadata(page: PageKey): Metadata {
  return pageMetadata[page] || pageMetadata.home
}

export const defaultMetadata: Metadata = {
  title: {
    default: 'ForgePilot',
    template: '%s | ForgePilot',
  },
  description: 'Launch blueprint platform for business idea validation, advanced branding, and proof-backed go-to-market execution.',
  keywords: ['branding', 'AI', 'logo generator', 'brand identity', 'small business', 'startup'],
  authors: [{ name: 'ForgePilot AI' }],
  creator: 'ForgePilot AI',
  publisher: 'ForgePilot AI',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ForgePilot AI',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@forgepilot',
  },
}
