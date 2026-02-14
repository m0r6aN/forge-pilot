'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LaunchAdvancedOptions, LaunchTeaser } from '@/lib/launch/types'

const DEFAULT_ADVANCED: LaunchAdvancedOptions = {
  colorMode: 'none',
  hexColors: [],
  colorVibe: null,
  tone: null,
  budget: null,
}

type Step = 'idea' | 'clarify' | 'teaser'

export function LaunchSession() {
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [advanced, setAdvanced] = useState<LaunchAdvancedOptions>(DEFAULT_ADVANCED)
  const [hexDraft, setHexDraft] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [teaser, setTeaser] = useState<LaunchTeaser | null>(null)
  const [traceId, setTraceId] = useState<string>('')
  const [receiptRef, setReceiptRef] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailStatusLoading, setEmailStatusLoading] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null)

  const sessionId = useMemo(() => crypto.randomUUID(), [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    setEmailVerified(searchParams.get('unlock') === 'verified')
    setCheckoutStatus(searchParams.get('checkout'))
  }, [])

  const canSubmitIdea = idea.trim().length >= 20

  const addHexColor = () => {
    const clean = hexDraft.trim()
    if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(clean)) {
      return
    }

    setAdvanced((prev) => {
      if (prev.hexColors.includes(clean) || prev.hexColors.length >= 3) {
        return prev
      }
      return {
        ...prev,
        hexColors: [...prev.hexColors, clean],
      }
    })

    setHexDraft('')
  }

  const removeHexColor = (hex: string) => {
    setAdvanced((prev) => ({
      ...prev,
      hexColors: prev.hexColors.filter((value) => value !== hex),
    }))
  }

  const submitIdea = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/launch/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          advanced,
          sessionId,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Teaser generation failed')
      }

      setTraceId(payload.traceId || '')
      setReceiptRef(payload.receiptRef || '')

      if (payload.needs_clarification) {
        const nextQuestions = Array.isArray(payload.questions) ? payload.questions.slice(0, 2) : []
        setQuestions(nextQuestions)
        setAnswers(nextQuestions.map(() => ''))
        setStep('clarify')
        return
      }

      setTeaser(payload.teaser)
      setStep('teaser')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const submitAnswers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/launch/teaser/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          idea,
          advanced,
          answers,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Teaser completion failed')
      }

      setTeaser(payload.teaser)
      setTraceId(payload.traceId || traceId)
      setReceiptRef(payload.receiptRef || receiptRef)
      setStep('teaser')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const requestEmailLink = async () => {
    setEmailStatusLoading(true)
    setError('')

    try {
      const response = await fetch('/api/launch/unlock/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sessionId }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send verification link')
      }

      setLinkSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEmailStatusLoading(false)
    }
  }

  const refreshEmailStatus = async () => {
    setEmailStatusLoading(true)

    try {
      const response = await fetch(`/api/launch/unlock/status?sessionId=${encodeURIComponent(sessionId)}`)
      const payload = await response.json()
      const verified = Boolean(payload.verified)
      setEmailVerified(verified)
      if (verified) {
        setEmailModalOpen(false)
      }
    } catch {
      setEmailVerified(false)
    } finally {
      setEmailStatusLoading(false)
    }
  }

  const startCheckout = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payments/create_launch_checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Checkout failed')
      }

      window.location.href = payload.url
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const onUnlockClick = async () => {
    if (emailVerified) {
      await startCheckout()
      return
    }

    setEmailModalOpen(true)
  }

  const retryCurrentStep = async () => {
    if (step === 'clarify') {
      await submitAnswers()
      return
    }
    await submitIdea()
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">ForgePilot Launch Session</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">A calm strategy room before we build.</h1>
          <p className="mt-4 text-muted-foreground">
            We sharpen your idea first, show a focused teaser, then unlock the full launch blueprint.
          </p>
        </div>

        {checkoutStatus === 'success' && (
          <Card className="border-green-200">
            <CardContent className="pt-6 text-sm text-green-700">
              Payment confirmed. Your full blueprint delivery is now queued to your verified email.
            </CardContent>
          </Card>
        )}

        {checkoutStatus === 'canceled' && (
          <Card className="border-amber-200">
            <CardContent className="pt-6 text-sm text-amber-700">
              Checkout was canceled. Your teaser is still saved, and you can unlock again anytime.
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-red-700">{error}</p>
              {(step === 'idea' || step === 'clarify') && (
                <Button variant="outline" onClick={retryCurrentStep} disabled={loading}>
                  Retry Strategy Session
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-800">Strategy session in progress...</p>
              <div className="mt-3 grid gap-1 text-xs text-slate-600">
                <p>1. Evaluating clarity signals</p>
                <p>2. Tightening strategic angle</p>
                <p>3. Drafting teaser preview</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'idea' && (
          <Card>
            <CardHeader>
              <CardTitle>Start with your idea</CardTitle>
              <CardDescription>
                Share what you want to build. Keep it concrete enough for strategic framing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                className="min-h-48"
                placeholder="Describe the venture, who it helps, and what makes it timely."
              />

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium">Advanced options</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color direction</label>
                      <Select
                        value={advanced.colorMode}
                        onValueChange={(value: 'none' | 'hex' | 'vibe') =>
                          setAdvanced((prev) => ({ ...prev, colorMode: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No preference</SelectItem>
                          <SelectItem value="hex">Use 1-3 hex colors</SelectItem>
                          <SelectItem value="vibe">Give a color vibe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tone</label>
                      <Select
                        value={advanced.tone || 'none'}
                        onValueChange={(value) =>
                          setAdvanced((prev) => ({ ...prev, tone: value === 'none' ? null : value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No preference</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="playful">Playful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Budget posture</label>
                      <Select
                        value={advanced.budget || 'none'}
                        onValueChange={(value) =>
                          setAdvanced((prev) => ({
                            ...prev,
                            budget: value === 'none' ? null : (value as 'small' | 'medium' | 'aggressive'),
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {advanced.colorMode === 'vibe' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Color vibe</label>
                        <Input
                          value={advanced.colorVibe || ''}
                          onChange={(event) =>
                            setAdvanced((prev) => ({
                              ...prev,
                              colorVibe: event.target.value.trim() ? event.target.value : null,
                            }))
                          }
                          placeholder="Example: industrial confidence with warm highlights"
                        />
                      </div>
                    )}
                  </div>

                  {advanced.colorMode === 'hex' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Hex colors (max 3)</label>
                      <div className="flex gap-2">
                        <Input value={hexDraft} onChange={(event) => setHexDraft(event.target.value)} placeholder="#112233" />
                        <Button type="button" variant="outline" onClick={addHexColor}>
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {advanced.hexColors.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            className="rounded-full border px-3 py-1 text-xs"
                            onClick={() => removeHexColor(hex)}
                          >
                            {hex}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>

              <Button onClick={submitIdea} disabled={!canSubmitIdea || loading} size="lg">
                {loading ? 'Building your teaser...' : 'Begin Strategy Session'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'clarify' && (
          <Card>
            <CardHeader>
              <CardTitle>One quick strategy pass</CardTitle>
              <CardDescription>
                Answer these to sharpen the teaser. This is a single clarification round.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question, index) => (
                <div key={question} className="space-y-2">
                  <label className="text-sm font-medium">{question}</label>
                  <Textarea
                    value={answers[index] || ''}
                    onChange={(event) => {
                      const next = [...answers]
                      next[index] = event.target.value
                      setAnswers(next)
                    }}
                    className="min-h-28"
                  />
                </div>
              ))}

              <Button onClick={submitAnswers} disabled={loading || answers.some((answer) => !answer.trim())}>
                {loading ? 'Finalizing teaser...' : 'Generate Teaser'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'teaser' && teaser && (
          <Card>
            <CardHeader>
              <CardTitle>Launch Session Teaser</CardTitle>
              <CardDescription>
                Strategic preview only. Full launch blueprint remains locked until checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold">1. Working Name</h3>
                <p className="mt-2 text-sm leading-7">{teaser.workingName}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">2. Positioning Snapshot</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{teaser.positioning}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">3. Market Pressure Insight</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{teaser.marketPressure}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">4. Brand Color Direction</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{teaser.colorDirection}</p>
              </section>

              <div className="rounded-xl border bg-slate-50 p-5">
                <p className="text-sm font-medium">Locked blueprint sections</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground blur-[1px] select-none">
                  <div>Go-to-market sequence (90 days)</div>
                  <div>Monetization architecture and pricing posture</div>
                  <div>Distribution channels and execution stack</div>
                  <div>Offer design and conversion mechanics</div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-blue-50 p-4 text-xs text-slate-700">
                <p>Trace: {traceId || 'pending'}</p>
                <p>Receipt: {receiptRef || 'pending'}</p>
              </div>

              <Button size="lg" onClick={onUnlockClick} disabled={loading}>
                Unlock Full Launch Blueprint - $69
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Where should I send your blueprint?</CardTitle>
              <CardDescription>Email verification is required before checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="founder@company.com"
              />

              {linkSent && (
                <p className="text-xs text-muted-foreground">
                  Verification link sent. Open that email, then return here and confirm.
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={requestEmailLink} disabled={!email || emailStatusLoading}>
                  {emailStatusLoading ? 'Sending...' : 'Send Verification Link'}
                </Button>
                <Button variant="outline" onClick={refreshEmailStatus} disabled={emailStatusLoading}>
                  I Verified My Email
                </Button>
              </div>

              {emailVerified && (
                <Button className="w-full" onClick={startCheckout} disabled={loading}>
                  Continue to Checkout
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => setEmailModalOpen(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
