import { LaunchSession } from '@/components/launch/launch-session'

export default function LaunchPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is included in the $69 launch plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You get a complete 90-day launch plan with positioning, monetization, channels, and execution priorities.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long does the session take?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Most founders complete the intake in 5-10 minutes, including any clarification questions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Will I need to answer a lot of follow-up questions?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. ForgePilot asks at most two clarification questions if needed.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can this work for local and online businesses?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The session adapts strategy based on business type, location constraints, and timeline.',
        },
      },
    ],
  }

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ForgePilot Launch Plan',
    description: 'Co-founder style session that generates a 90-day launch plan for founders.',
    brand: {
      '@type': 'Brand',
      name: 'ForgePilot',
    },
    offers: {
      '@type': 'Offer',
      price: '69',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://forgepilot.com/launch',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <LaunchSession />
    </>
  )
}
