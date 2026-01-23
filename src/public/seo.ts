import { Metadata } from 'next'

type PageKey = 'home' | 'generator' | 'dashboard' | 'pricing' | 'admin'

const pageMetadata: Record<PageKey, Metadata> = {
  home: {
    title: 'BrandGenie AI - Autonomous Branding Platform',
    description: 'Generate complete brand identities for entrepreneurs, side-hustlers, and small businesses in minutes - not months.',
    openGraph: {
      title: 'BrandGenie AI - Autonomous Branding Platform',
      description: 'Generate complete brand identities in minutes',
      type: 'website',
    },
  },
  generator: {
    title: 'Brand Generator - BrandGenie AI',
    description: 'Create your complete brand identity with AI-powered creativity. Generate logos, color palettes, typography, and more.',
    openGraph: {
      title: 'Brand Generator - BrandGenie AI',
      description: 'Create your complete brand identity with AI-powered creativity',
      type: 'website',
    },
  },
  dashboard: {
    title: 'Dashboard - BrandGenie AI',
    description: 'Manage your brands, view analytics, and access all your brand assets.',
    openGraph: {
      title: 'Dashboard - BrandGenie AI',
      description: 'Manage your brands and assets',
      type: 'website',
    },
  },
  pricing: {
    title: 'Pricing - BrandGenie AI',
    description: 'Choose the perfect plan for your branding needs. Start for free or upgrade for advanced features.',
    openGraph: {
      title: 'Pricing - BrandGenie AI',
      description: 'Choose the perfect plan for your branding needs',
      type: 'website',
    },
  },
  admin: {
    title: 'Admin Dashboard - BrandGenie AI',
    description: 'Administrative panel for managing users, metrics, and platform operations.',
    openGraph: {
      title: 'Admin Dashboard - BrandGenie AI',
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
    default: 'BrandGenie AI',
    template: '%s | BrandGenie AI',
  },
  description: 'Generate complete brand identities for entrepreneurs, side-hustlers, and small businesses in minutes - not months.',
  keywords: ['branding', 'AI', 'logo generator', 'brand identity', 'small business', 'startup'],
  authors: [{ name: 'BrandGenie AI' }],
  creator: 'BrandGenie AI',
  publisher: 'BrandGenie AI',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'BrandGenie AI',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@brandgenie',
  },
}
