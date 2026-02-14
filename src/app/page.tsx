import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          ForgePilot
          <span className="block text-primary">Your AI Co-Founder for Launching Real Businesses</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          The Launch Session gives you a strategic teaser first, then unlocks the full blueprint.
        </p>
        <div className="pt-4">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/launch">Start My Launch Session - $69</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
