'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function ContinuePageContent() {
  const search = useSearchParams()
  const router = useRouter()
  const returnTo = useMemo(() => search.get('returnTo') || '/launch', [search])
  const verified = search.get('verified') === '1'
  const invalid = search.get('status') === 'invalid'
  const resumeCodeFromQuery = search.get('code') || ''

  const [email, setEmail] = useState('')
  const [code, setCode] = useState(resumeCodeFromQuery)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)

  useEffect(() => {
    setCode(resumeCodeFromQuery)
  }, [resumeCodeFromQuery])

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))

  const sendLink = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })
      const payload = await response.json()
      if (!response.ok || payload?.ok === false) {
        setError(payload?.message || 'Unable to send link right now.')
        return
      }
      setMessage(payload?.message || "If it's a valid address, you'll receive a link.")
      setCooldownUntil(Date.now() + 30_000)
    } finally {
      setLoading(false)
    }
  }

  const resumeSession = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, returnTo }),
      })
      const payload = await response.json()
      if (!response.ok || payload?.ok === false) {
        setError(payload?.message || 'Invalid or expired code.')
        return
      }
      const href = payload?.next?.href || returnTo
      router.push(href)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-12 md:py-16 continue-cinematic fp-cinematic-page rounded-2xl px-2 md:px-3">
      <div className="fp-cinematic-content mx-auto max-w-xl space-y-6 py-5 md:py-6">
        <Card className="fp-glass-panel-soft">
          <CardHeader>
            <CardTitle>{verified ? "You're in." : invalid ? 'That link has expired' : 'One last step.'}</CardTitle>
            <CardDescription>
              {verified
                ? "Your strategy session is ready. Let's build something real."
                : invalid
                  ? "No problem. We'll send you a new one."
                  : 'Enter your email and we will send a secure link so you can continue instantly.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!verified && (
              <form onSubmit={sendLink} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your email</label>
                  <Input
                    className="fp-input-dark"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="founder@company.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">We&apos;ll only use this to continue your session.</p>
                </div>
                <Button type="submit" disabled={loading || cooldownSeconds > 0}>
                  {loading ? 'Sending link...' : invalid ? 'Send new link' : 'Continue via link'}
                </Button>
                {cooldownSeconds > 0 && (
                  <p className="text-xs text-muted-foreground">You can resend in {cooldownSeconds}s</p>
                )}
              </form>
            )}

            {verified && (
              <Button onClick={() => router.push(returnTo)}>Continue</Button>
            )}

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Verified on another device?</p>
              <form onSubmit={resumeSession} className="flex gap-2">
                <Input
                  className="fp-input-dark"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Paste resume code"
                />
                <Button type="submit" variant="outline" disabled={loading}>
                  Continue
                </Button>
              </form>
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <p className="text-xs text-muted-foreground">
              Powered by OMEGA. Secure. Private. No passwords.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ContinuePage() {
  return (
    <Suspense fallback={<div className="container py-12 md:py-16" />}>
      <ContinuePageContent />
    </Suspense>
  )
}
