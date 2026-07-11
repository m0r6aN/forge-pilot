export const marketingPlans = [
  {
    id: 'marketing-starter',
    name: 'Marketing Starter',
    price: 97,
    description: 'Perfect for new businesses',
    features: [
      '2 Active Campaigns',
      'Google & Facebook Ads',
      'Basic Email Marketing (1,000 contacts)',
      'Monthly Performance Reports',
      'Up to $1,000/month ad spend',
      'Campaign Setup & Optimization'
    ],
    limits: {
      campaigns: 2,
      adSpend: 1000,
      emailContacts: 1000,
      channels: ['google', 'facebook', 'email']
    }
  },
  {
    id: 'marketing-growth',
    name: 'Marketing Growth',
    price: 197,
    description: 'For scaling businesses',
    features: [
      '5 Active Campaigns',
      'All Major Platforms (Google, Facebook, Instagram, TikTok, LinkedIn)',
      'Advanced Email Sequences (5,000 contacts)',
      'AI Content Generation',
      'Weekly Reports & Optimization',
      'Up to $5,000/month ad spend',
      'A/B Testing',
      'Conversion Tracking'
    ],
    limits: {
      campaigns: 5,
      adSpend: 5000,
      emailContacts: 5000,
      channels: ['google', 'facebook', 'instagram', 'tiktok', 'linkedin', 'email', 'sms']
    },
    popular: true
  },
  {
    id: 'marketing-scale',
    name: 'Marketing Scale',
    price: 397,
    description: 'For established companies',
    features: [
      'Unlimited Campaigns',
      'All Platforms + YouTube Ads',
      'Advanced Marketing Automation',
      '🎥 AI Video Ad Generation (included)',
      'Daily Campaign Optimization',
      'Unlimited Email Contacts',
      'Unlimited Ad Spend',
      'Dedicated Success Manager',
      'Custom Landing Pages',
      'Advanced Analytics Dashboard'
    ],
    limits: {
      campaigns: -1,
      adSpend: -1,
      emailContacts: -1,
      channels: ['all']
    }
  },
  {
    id: 'marketing-enterprise',
    name: 'Marketing Enterprise',
    price: 997,
    description: 'For agencies and large businesses',
    features: [
      'Everything in Marketing Scale',
      'White-Label Marketing Dashboard',
      'Client Management System',
      'Multi-Brand Campaign Management',
      'Advanced Attribution Modeling',
      'Custom Integrations',
      'Priority Support',
      'Quarterly Strategy Sessions'
    ],
    enterprise: true
  }
]

// Additional revenue streams
export const marketingAddOns = {
  'video-ads': {
    name: 'AI Video Ad Generation',
    price: 47, // per video
    description: 'Custom video ads for your campaigns'
  },
  'landing-pages': {
    name: 'Custom Landing Pages',
    price: 97, // per page
    description: 'High-converting landing pages'
  },
  'advanced-analytics': {
    name: 'Advanced Analytics',
    price: 47, // per month
    description: 'Deep-dive analytics and insights'
  },
  'strategy-session': {
    name: '1-on-1 Strategy Session',
    price: 197, // per session
    description: 'Personal marketing consultation'
  }
}