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
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(to right, rgba(0,0,0,0.97) 0%, rgba(2,20,24,0.9) 100%)'
                : 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(242,252,254,0.74) 100%)',
            }}
          />
          {isDark && (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black to-transparent"
            />
          )}
        </div>

        <div className="mx-auto max-w-6xl px-6 pt-8 pb-20 md:px-8 md:pt-10 md:pb-24 lg:pt-10 lg:pb-24 2xl:pt-12 2xl:pb-32 lg:min-h-[calc(100vh-128px)] 2xl:min-h-[calc(100vh-140px)] lg:flex lg:items-start">
          <div className="grid items-center gap-12 md:gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="animate-fade-in space-y-6">
              <h1 className="text-5xl font-bold tracking-tight text-foreground leading-[1.05] sm:text-6xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
                Clarity Before You Launch
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                A focused co-founder session that sharpens your idea and delivers a practical 90-day launch blueprint.
              </p>
              <Button asChild size="lg" className="h-12 bg-cyan-700 px-8 text-base text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-[1px] hover:bg-cyan-800">
                <Link href="/launch">Start My Launch Session — $69</Link>
              </Button>
            </div>

            <div className="animate-fade-in-delay-1 relative flex justify-center lg:justify-end lg:pr-12 lg:-translate-x-[1%]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[300px] w-[300px] rounded-full bg-cyan-400/14 blur-3xl sm:h-[360px] sm:w-[360px] lg:h-[420px] lg:w-[420px]" />
              </div>
              <Image
                src="/images/forge_pilot_wings.png"
                alt="ForgePilot logo"
                width={942}
                height={868}
                sizes="(min-width: 1280px) 40vw, (min-width: 768px) 42vw, 68vw"
                quality={82}
                priority
                className={`hero-logo-float h-auto w-[68%] max-w-[528px] object-contain scale-[1.03] sm:w-[64%] lg:w-[92%] lg:scale-100 xl:w-full ${isDark ? '' : 'drop-shadow-[0_18px_42px_rgba(8,145,178,0.2)]'}`}
              />
            </div>
          </div>
        </div>

        <a
          href="#what-you-get"
          className="scroll-cue absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-xs uppercase tracking-[0.2em] text-muted-foreground xl:block"
          aria-label="Scroll to What You Get"
        >
          Scroll
        </a>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES SECTION
          ═══════════════════════════════════════ */}
      <section id="what-you-get" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold tracking-tight text-cyan-800 md:text-3xl dark:text-cyan-300">
              What You Get
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Everything you need to go from rough idea to validated launch plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div key={feature.title} className="group relative rounded-xl border border-border/50 bg-card p-7 transition-all duration-200 hover:border-border hover:shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100/70 text-cyan-700 transition-colors group-hover:text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">
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
            <h2 className="text-2xl font-semibold tracking-tight text-cyan-800 md:text-3xl dark:text-cyan-300">
              How It Works
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Three steps to a launch-ready strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {steps.map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-sm font-semibold text-white">
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
            <h2 className="text-2xl font-semibold tracking-tight text-cyan-800 md:text-3xl dark:text-cyan-300">
              Ready to Launch with Confidence?
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Spend 10 minutes with ForgePilot and walk away with a plan
              you can execute on day one.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 bg-cyan-700 px-8 text-base text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-[1px] hover:bg-cyan-800">
              <Link href="/launch">
                Start My Launch Session — $69
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
