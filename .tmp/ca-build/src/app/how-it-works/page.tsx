import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | ForgePilot",
  description: "How ForgePilot Launch Session works, what you receive, and what to expect.",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-20">
      <header className="max-w-3xl">
        <p className="text-sm tracking-widest text-muted-foreground">HOW IT WORKS</p>
        <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">
          A focused process that turns raw ideas into an execution-ready launch plan.
        </h1>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          The session is built for speed and realism. You get clear artifacts you can use immediately, not abstract advice.
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
        <Card title="1) Intake and Context">
          You describe your venture, constraints, and target outcome. ForgePilot extracts the operating context quickly.
        </Card>
        <Card title="2) Strategic Framing">
          The system stress-tests positioning and identifies where the offer can win in the market right now.
        </Card>
        <Card title="3) Deliverables Produced">
          You get concrete artifacts: strategy snapshot, messaging direction, offer architecture, and launch priorities.
        </Card>
        <Card title="4) 90-Day Execution Blueprint">
          A practical timeline with milestones, sequence, and immediate next actions for week one through week twelve.
        </Card>
        <Card title="5) Privacy and Session Security">
          Session access is verification-based and designed to limit exposure while preserving continuity.
        </Card>
        <Card title="6) Quality and Risk Review">
          Key assumptions, likely blockers, and validation points are surfaced before expensive execution begins.
        </Card>
      </section>

      <footer className="mt-14 border-t border-border/40 pt-8 text-sm text-muted-foreground md:mt-16">
        Ready to generate your plan?{" "}
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
