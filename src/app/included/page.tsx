import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What's Included | ForgePilot",
  description: "What you get from a ForgePilot Launch Session.",
};

export default function IncludedPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-20">
      <header className="max-w-2xl">
        <p className="text-sm tracking-widest text-muted-foreground">
          WHAT&apos;S INCLUDED
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">
          A launch session that produces real artifacts - not vibes.
        </h1>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          You leave with a clear plan, crisp positioning, and a practical 90-day
          blueprint you can execute immediately.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/launch"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start Launch Session
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background/10 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/40"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <section className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2">
        <Card title="1) Strategy Snapshot">
          Clear definition of the product, audience, and why it wins now.
        </Card>
        <Card title="2) Positioning & Messaging">
          A tight narrative you can reuse across site, pitch, and onboarding.
        </Card>
        <Card title="3) Offer & Packaging">
          What you sell, how it&apos;s priced, and what &quot;done&quot; looks like.
        </Card>
        <Card title="4) 90-Day Execution Plan">
          Weekly milestones, highest-leverage actions, and measurable targets.
        </Card>
        <Card title="5) Go-to-Market Starter Kit">
          Channel picks plus initial campaigns you can run without a huge budget.
        </Card>
        <Card title="6) Risk & Reality Check">
          Assumptions, blockers, and what to validate before you build too much.
        </Card>
      </section>

      <footer className="mt-14 border-t border-border/40 pt-8 text-sm text-muted-foreground md:mt-16">
        Want to skip reading and just get the plan?{" "}
        <Link href="/launch" className="text-foreground hover:underline">
          Start a Launch Session
        </Link>
        .
      </footer>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/5 p-6 backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">{children}</p>
    </div>
  );
}
