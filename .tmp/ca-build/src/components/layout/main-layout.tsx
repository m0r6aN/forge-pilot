'use client'

import { HeaderBand } from '@/components/layout/HeaderBand'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/launch', label: 'Launch Session' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBand>
        <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-start">
            <Link href="/" className="group flex items-center gap-2">
              <span className="text-2xl font-semibold tracking-tight text-white/90 transition-colors group-hover:text-white">
                ForgePilot
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <nav className="pointer-events-auto flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-2">
            <div className="hidden md:flex items-center [&>button]:h-7 [&>button]:w-7 [&>button]:rounded-full [&>button]:text-white/80 [&>button:hover]:bg-white/10 [&>button:hover]:text-white [&>button:focus-visible]:ring-white/30">
              <ThemeToggle />
            </div>

            <div className="inline-flex rounded-full bg-black/30 p-2 backdrop-blur-md ring-1 ring-white/10 md:hidden">
              <ThemeToggle />
            </div>

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md ring-1 ring-white/10 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </HeaderBand>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border/40 bg-background/90 backdrop-blur-lg">
          <div className="mx-auto max-w-6xl space-y-3 px-6 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8 py-10 md:py-12">
          <div className="flex flex-col gap-6 border-b border-border/40 pb-7 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/images/forgepilot-mark-dark.png"
                alt="ForgePilot"
                width={36}
                height={21}
                className="h-auto w-9 object-contain"
              />
              <div className="space-y-0.5">
                <span className="block text-sm font-semibold text-foreground">ForgePilot</span>
                <p className="text-xs text-muted-foreground">Clarity before you launch.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5 md:gap-6">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>Governed by Keon.</p>
            <p>© {new Date().getFullYear()} ForgePilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-medium transition-colors",
        active ? "text-white" : "text-white/80 hover:text-white"
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 right-0 -bottom-1.5 mx-auto h-px w-6 transition-all",
          active ? "w-full bg-cyan-400/70 shadow-[0_0_10px_rgba(56,189,248,0.4)]" : "bg-white/0"
        )}
      />
    </Link>
  )
}
