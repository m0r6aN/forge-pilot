'use client'

import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

/* ─── Feature data ─── */
const features = [
  {
    title: "Deep Market Analysis",
    description: "AI-powered research into your target market, competitors, and positioning — surfaced in minutes, not months.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "90-Day Launch Blueprint",
    description: "A structured, actionable plan covering branding, go-to-market strategy, pricing, and first-customer acquisition.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    title: "Brand Identity Kit",
    description: "Logo concepts, color palettes, typography, and voice guidelines tailored to your business and audience.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    title: "Governed Consistency",
    description: "Every output is validated by Keon governance — ensuring quality, coherence, and strategic alignment.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

const steps = [
  {
    step: "01",
    title: "Describe Your Idea",
    description: "Share your business concept in plain language. ForgePilot asks the right questions to understand your vision.",
  },
  {
    step: "02",
    title: "AI Co-Founder Session",
    description: "Deep analysis runs across markets, competitors, and positioning to stress-test and sharpen your plan.",
  },
  {
    step: "03",
    title: "Receive Your Blueprint",
    description: "Get a complete 90-day launch plan with brand assets, strategy, and next steps — ready to execute.",
  },
]

export default function HomePage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <>
      {/* ═══════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl px-6 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="flex flex-col items-center text-center">

            {/* Logo Mark */}
            <div className="animate-fade-in mb-10">
              <Image
                src="/images/forgepilot-mark-dark.png"
                alt="ForgePilot"
                width={280}
                height={161}
                priority
                className={`object-contain rounded-lg ${isDark ? '' : 'ring-1 ring-border/60 shadow-lg'}`}
              />
            </div>

            {/* Headline */}
            <div className="animate-fade-in-delay-1 space-y-5 max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-foreground">
                Clarity Before You Launch
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl mx-auto">
                A focused co-founder session that sharpens your idea and delivers
                a practical 90-day launch blueprint.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row items-center gap-4 mt-10">
              <Button asChild size="lg" className="px-8 text-base h-12">
                <Link href="/launch">
                  Start My Launch Session — $69
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 text-base h-12">
                <Link href="/pricing">
                  View Plans
                </Link>
              </Button>
            </div>

            {/* Quiet reassurance */}
            <p className="animate-fade-in-delay-3 mt-8 text-sm text-muted-foreground">
              No fluff. No hype. Just focused strategy.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES SECTION
          ═══════════════════════════════════════ */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-foreground">
              What You Get
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Everything you need to go from rough idea to validated launch plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border/50 bg-card p-7 transition-all duration-200 hover:border-border hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-foreground">
              How It Works
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Three steps to a launch-ready strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {steps.map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background text-sm font-semibold mb-5">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════ */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-20 md:py-28">
          <div className="flex flex-col items-center text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-foreground">
              Ready to Launch with Confidence?
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Spend 10 minutes with ForgePilot and walk away with a plan
              you can execute on day one.
            </p>
            <Button asChild size="lg" className="mt-8 px-8 text-base h-12">
              <Link href="/launch">
                Start My Launch Session
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          GOVERNANCE SEAL
          ═══════════════════════════════════════ */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-10">
          <div className="flex flex-col items-center gap-3">
            <Image
              src={isDark ? "/images/governed-by-keon-dark.png" : "/images/governed-by-keon-cyan-trans.png"}
              alt="Governed by Keon"
              width={40}
              height={40}
              className="object-contain opacity-60"
            />
            <span className="text-xs text-muted-foreground">
              Governed by Keon
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
