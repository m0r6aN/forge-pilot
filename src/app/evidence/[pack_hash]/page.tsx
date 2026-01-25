import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type EvidencePageProps = {
  params: {
    pack_hash: string
  }
}

export default function EvidencePackPage({ params }: EvidencePageProps) {
  const packHash = params.pack_hash

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">MOCK</Badge>
            <Badge variant="outline">Evidence shell</Badge>
          </div>
          <h1 className="text-3xl font-semibold">Evidence Pack</h1>
          <p className="text-sm text-muted-foreground">
            Pack hash: <span className="font-mono">{packHash}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Awaiting Keon wiring</Badge>
          <Badge variant="outline">No inference</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evidence overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Placeholder view for raw evidence artifacts. This shell is ready for
                Keon evidence ingestion without refactors.
              </p>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="font-medium text-foreground">No evidence loaded</p>
                <p className="text-sm text-muted-foreground">
                  Connect Keon pack ingestion to render verified evidence items.
                </p>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                TODO(keon): Map evidence bundle metadata into this section.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This timeline will show ordered artifacts once the Keon SDK supplies them.
              </p>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="font-medium text-foreground">Timeline empty</p>
                <p className="text-sm text-muted-foreground">
                  Awaiting canonical evidence events.
                </p>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                TODO(keon): Render evidence chronology from pack events.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Placeholder for Keon verification output. This section will display
                only verifiable fields (verdict, key id, verification method,
                timestamps). No interpretations.
              </p>
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="font-medium text-foreground">Trust narrative pending</p>
                <p className="text-sm text-muted-foreground">
                  This block will be populated by verified Keon outputs.
                </p>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                TODO(keon): Render verdict + kid + verification method + verified_at from Keon outputs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc space-y-2 pl-5">
                <li>Wire pack lookup via Keon SDK.</li>
                <li>Render evidence artifacts and sources.</li>
                <li>Render verification verdict + provenance (kid, method).</li>
              </ul>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                TODO(keon): Replace checklist with real integration status.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
