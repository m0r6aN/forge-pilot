const premiumPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Perfect for new entrepreneurs',
    features: [
      '3 Brand Identities',
      'Basic Logo Generation',
      'Color Palette & Typography',
      'Email Support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    description: 'For scaling businesses',
    features: [
      'Unlimited Brand Identities',
      'Advanced Logo Generation',
      '🎨 3D Logo Rendering ($15-75 each)',
      '🎬 3D Splash Screens ($45-225 each)',
      '🎥 AI Video Generation ($75-425 each)',
      '🌐 Site Hosting ($25/month per site)',
      '🛒 E-commerce Integration ($50/month per store)',
      'Marketing Campaign Tools',
      'Priority Support'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    description: 'For established companies',
    features: [
      'Everything in Growth',
      '🎯 Unlimited 3D Renders (included)',
      '🎬 Unlimited Video Generation (included)',
      '🏢 Unlimited Site Hosting (included)',
      '🛒 Unlimited E-commerce Stores (included)',
      'White-label Solutions',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager'
    ]
  },
  {
    id: 'white-label',
    name: 'White-Label Agency',
    price: 999,
    description: 'For agencies and resellers',
    features: [
      'Complete White-Label Platform',
      'Custom Branding & Domain',
      'Client Management System',
      'Revenue Sharing (70/30 split)',
      'Unlimited Everything for Clients',
      'Agency Dashboard & Analytics',
      'Priority Support & Training',
      'Custom Integrations',
      'Dedicated Success Manager'
    ],
    enterprise: true
  }
]

// Premium feature pricing breakdown
export const featurePricing = {
  '3d-rendering': {
    'draft': 15,
    'standard': 35,
    'premium': 55,
    'ultra': 75
  },
  'video-generation': {
    '15s': 75,
    '30s': 125,
    '60s': 225,
    '90s': 325,
    '120s': 425
  },
  'site-hosting': 25, // per month
  'ecommerce': 50, // per month
  'white-label': 999 // per month
}