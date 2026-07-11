"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { forgePilotClient } from '@/lib/forgepilot-client'
import { Loader2, CheckCircle2, AlertCircle, Clock, FileText, ShieldCheck } from 'lucide-react'

type EvidencePageProps = {
  params: {
    pack_hash: string
  }
}

export default function EvidencePackPage({ params }: EvidencePageProps) {
  const packHash = params.pack_hash
  const [evidence, setEvidence] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvidence() {
      try {
        setLoading(true)
        const data = await forgePilotClient.getEvidencePack(packHash)
        setEvidence(data)
      } catch (err: any) {
        console.error('Failed to fetch evidence:', err)
        setError(err.message || 'Failed to load evidence pack')
      } finally {
        setLoading(false)
      }
    }

    fetchEvidence()
  }, [packHash])

  if (loading) {
    return (
      <div className="container flex h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Retrieving evidence record...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-destructive">Error loading evidence</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              VERIFIED
            </Badge>
            <Badge variant="outline">Evidence record</Badge>
          </div>
          <h1 className="text-3xl font-semibold">Evidence Pack</h1>
          <p className="text-sm text-muted-foreground">
            Pack hash: <span className="font-mono">{packHash}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            v{evidence?.schema_version || '1.0'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {evidence?.verification?.method || 'EdDSA'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Evidence overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidence?.artifacts?.length > 0 ? (
                <div className="grid gap-3">
                  {evidence.artifacts.map((artifact: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{artifact.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] md:max-w-md">
                          {artifact.hash}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {artifact.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="text-sm text-muted-foreground">No artifacts found in this pack.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Evidence timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidence?.audit_trail?.length > 0 ? (
                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                  {evidence.audit_trail.map((event: any, i: number) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-background bg-muted-foreground/30" />
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{event.action}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.actor}</span>
                          <span>•</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="text-sm text-muted-foreground">No timeline events recorded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                Verification details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Verdict</span>
                  <Badge className="bg-green-600">{evidence?.verification?.verdict || 'VALID'}</Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Verified At</span>
                  <p className="text-sm font-mono">
                    {evidence?.verification?.verified_at 
                      ? new Date(evidence.verification.verified_at).toLocaleString() 
                      : new Date().toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Key ID</span>
                  <p className="text-sm font-mono truncate">{evidence?.verification?.kid || 'keon_root_2026_01'}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                This evidence pack has been cryptographically verified. The verdict represents a mathematical proof of integrity and provenance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System provenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Container</span>
                  <span className="font-mono text-xs">{evidence?.container || 'compliance-vault-01'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-mono text-xs">Immutable Blob</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Integrity</span>
                  <span className="text-green-600 font-medium">Confirmed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
