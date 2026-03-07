import { PricingTiers } from '@/components/pricing/pricing-tiers'

export default function PricingPage() {
  return (
    <div className="container py-12 md:py-16 pricing-cinematic fp-cinematic-page rounded-2xl px-2 md:px-3">
      <div className="fp-cinematic-content py-6">
        <h1 className="text-4xl font-bold text-center mb-4">ForgePilot Launch Blueprint</h1>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          One focused offer for v1 revenue. Everything else is frozen until this blueprint is selling consistently.
        </p>
        <PricingTiers />
      </div>
    </div>
  )
}
