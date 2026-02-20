'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LaunchAdvancedOptions, LaunchTeaser } from '@/lib/launch/types'
import { voiceStrings } from '@/lib/ui/voiceStrings'
import { useEffect, useMemo, useState } from 'react'

const DEFAULT_ADVANCED: LaunchAdvancedOptions = {
  colorMode: 'none',
  hexColors: [],
  colorVibe: null,
  tone: null,
  budget: null,
}
const TEMPORARY_TEASER_ERROR = 'We hit a temporary issue generating your strategy brief. Let\'s try again.'

type Step = 'idea' | 'clarify' | 'brief' | 'blueprint'
type IdeaCategory = 'saas' | 'local_service' | 'ecommerce' | 'marketplace' | 'content' | 'other' | null
type BizType = 'online' | 'physical' | 'both' | 'unsure'
type BudgetRange = 'under500' | '500_2k' | '2k_10k' | '10k_plus' | 'unsure'
type Timeline = '14' | '30' | '60' | '90' | 'flex'
type Experience = 'first_time' | 'built_before'
type Monetization = 'one_off' | 'subscription' | 'services' | 'mixed' | 'unsure'
type ExistingState = 'idea_only' | 'waitlist' | 'mvp' | 'customers'
type ExampleTab = 'saas' | 'local' | 'ecommerce'

const IDEA_CATEGORY_CHIPS: Array<{ value: Exclude<IdeaCategory, null>; label: string }> = [
  { value: 'saas', label: 'SaaS' },
  { value: 'local_service', label: 'Local service' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'content', label: 'Content' },
  { value: 'other', label: 'Other' },
]

const EXAMPLES: Record<ExampleTab, { title: string; example: string; why: string }> = {
  saas: {
    title: 'SaaS',
    example:
      'An AI inbox that auto-triages customer support tickets for Shopify stores, so founders stop drowning in refunds and shipping emails. Target: stores doing 50-500 orders/day. Why now: support costs are exploding and LLM tooling is finally reliable enough to automate safely.',
    why: 'This works because it names a clear customer, pain, and timing edge.',
  },
  local: {
    title: 'Local business',
    example:
      'Mobile detailing service for busy professionals in Austin. We come to offices/apartments. Target: people who value time over price. Why now: remote work ended; commuting returned; convenience services are booming.',
    why: 'This works because the offer, geography, and buyer value signal are explicit.',
  },
  ecommerce: {
    title: 'Ecommerce',
    example:
      'Premium dog supplements for anxious rescue dogs. Target: owners who already buy subscription treats. Why now: TikTok drove demand, but quality brands are scarce and trust is everything.',
    why: 'This works because demand, audience behavior, and differentiation are all concrete.',
  },
}

export function LaunchSession() {
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [entryEmail, setEntryEmail] = useState('')
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0)
  const [advanced, setAdvanced] = useState<LaunchAdvancedOptions>(DEFAULT_ADVANCED)
  const [hexDraft, setHexDraft] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [brief, setBrief] = useState<LaunchTeaser | null>(null)
  const [traceId, setTraceId] = useState<string>('')
  const [receiptRef, setReceiptRef] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [ideaCategory, setIdeaCategory] = useState<IdeaCategory>(null)
  const [bizType, setBizType] = useState<BizType>('unsure')
  const [location, setLocation] = useState('')
  const [budgetRange, setBudgetRange] = useState<BudgetRange>('unsure')
  const [timeline, setTimeline] = useState<Timeline>('90')
  const [experience, setExperience] = useState<Experience>('first_time')
  const [monetization, setMonetization] = useState<Monetization>('unsure')
  const [existingState, setExistingState] = useState<ExistingState>('idea_only')
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [examplesTab, setExamplesTab] = useState<ExampleTab>('saas')

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailStatusLoading, setEmailStatusLoading] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null)
  const [blueprint, setBlueprint] = useState<Record<string, unknown> | null>(null)
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [blueprintError, setBlueprintError] = useState('')

  const sessionId = useMemo(() => crypto.randomUUID(), [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    setEmailVerified(searchParams.get('unlock') === 'verified')
    setCheckoutStatus(searchParams.get('checkout'))
  }, [])

  const canSubmitIdea = idea.trim().length >= 20
  const resendCooldownSeconds = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000))

  const validateIdeaSubmission = (): string | null => {
    if (idea.trim().length < 20) {
      return 'Please provide at least 20 characters so strategy generation has enough context.'
    }

    if (advanced.colorMode === 'hex' && advanced.hexColors.length === 0) {
      return 'Add at least one hex color or switch color direction to No preference.'
    }

    if (advanced.colorMode === 'vibe' && !advanced.colorVibe?.trim()) {
      return 'Add a color vibe or switch color direction to No preference.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entryEmail.trim().toLowerCase())) {
      return 'Enter a valid email so we can send your secure verification link.'
    }

    if ((bizType === 'physical' || bizType === 'both') && location.trim().length < 2) {
      return 'Add your primary location (city + state) so we can shape the launch plan.'
    }

    return null
  }

  const validateClarificationSubmission = (): string | null => {
    if (!traceId) {
      return 'Missing workflow resume context. Please restart the strategy session.'
    }

    if (answers.some((answer) => !answer.trim())) {
      return 'Please answer all clarification prompts before continuing.'
    }

    if (Object.keys(buildAnswerPayload()).length === 0) {
      return 'Please provide at least one valid clarification answer.'
    }

    return null
  }

  const handleColorModeChange = (value: 'none' | 'hex' | 'vibe') => {
    setAdvanced((prev) => ({
      ...prev,
      colorMode: value,
      hexColors: value === 'hex' ? prev.hexColors : [],
      colorVibe: value === 'vibe' ? prev.colorVibe : null,
    }))
  }

  const buildAnswerPayload = () => {
    const payload: Record<string, string> = {}
    questions.forEach((question, index) => {
      const value = (answers[index] || '').trim()
      if (!value) {
        return
      }

      const key = question
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
        .replace(/[^a-z0-9]/g, '')
        .replace(/^[0-9]+/, '')

      payload[key || `answer${index + 1}`] = value
    })
    return payload
  }

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
    const validationError = validateIdeaSubmission()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setVerificationRequired(false)
    setVerificationMessage('')
    setVerificationModalOpen(false)

    try {
      const response = await fetch('/api/launch/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          email: entryEmail.trim().toLowerCase(),
          advanced,
          sessionId,
          returnTo: '/launch',
          intake: {
            ideaCategory,
            bizType,
            location: location.trim() || null,
            budgetRange,
            timeline,
            experience,
            monetization,
            existingState,
          },
        }),
      })

      const payload = await response.json()

      if (payload?.ok === false) {
        throw new Error(payload?.message || payload?.error?.message || TEMPORARY_TEASER_ERROR)
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Strategy brief generation failed')
      }

      if (payload?.verification_required) {
        setVerificationRequired(true)
        setVerificationMessage(payload?.message || 'Check your email to continue.')
        setResendCooldownUntil(Date.now() + 30_000)
        setVerificationModalOpen(true)
        return
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

      setBrief(payload.teaser)
      setStep('brief')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const submitAnswers = async () => {
    const validationError = validateClarificationSubmission()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setVerificationModalOpen(false)

    try {
      const response = await fetch('/api/launch/teaser/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId,
          answers: buildAnswerPayload(),
        }),
      })

      const payload = await response.json()

      if (payload?.ok === false) {
        throw new Error(payload?.message || payload?.error?.message || TEMPORARY_TEASER_ERROR)
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Strategy brief completion failed')
      }

      if (payload?.verification_required) {
        setVerificationRequired(true)
        setVerificationMessage(payload?.message || 'Check your email to continue.')
        setResendCooldownUntil(Date.now() + 30_000)
        setVerificationModalOpen(true)
        return
      }

      setBrief(payload.teaser)
      setTraceId(payload.traceId || traceId)
      setReceiptRef(payload.receiptRef || receiptRef)
      setStep('brief')
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
      if (!traceId || !receiptRef) {
        throw new Error('Missing trace/receipt binding. Regenerate your strategy brief before checkout.')
      }

      const response = await fetch('/api/payments/create_launch_checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, traceId, receiptRef }),
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

  const generateBlueprint = async () => {
    setBlueprintLoading(true)
    setBlueprintError('')
    try {
      const response = await fetch('/api/launch/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          teaser: brief,
          traceId,
          sessionId,
          advancedOptions: advanced,
        }),
      })
      const payload = await response.json()
      if (payload?.ok === false) {
        throw new Error(payload?.message || 'Blueprint generation failed')
      }
      setBlueprint(payload.blueprint)
      setStep('blueprint')
    } catch (err) {
      setBlueprintError((err as Error).message)
    } finally {
      setBlueprintLoading(false)
    }
  }

  const resendVerificationLink = async () => {
    if (!entryEmail.trim() || resendCooldownSeconds > 0) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: entryEmail.trim().toLowerCase(), returnTo: '/launch' }),
      })
      const payload = await response.json()
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.message || 'Unable to send link right now.')
      }
      setVerificationRequired(true)
      setVerificationMessage(payload?.message || 'Check your email to continue.')
      setResendCooldownUntil(Date.now() + 30_000)
      setVerificationModalOpen(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 md:py-8 launch-cinematic fp-cinematic-page rounded-2xl px-2 md:px-3">
      <div className="fp-cinematic-content mx-auto max-w-5xl space-y-6 py-2 md:py-3">
        <div className="fp-glass-panel rounded-xl p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">ForgePilot Launch Session</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">1) Define</span>
            <span className="opacity-60">→</span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">2) Confirm</span>
            <span className="opacity-60">→</span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">3) Launch Plan Preview</span>
          </div>
          <h1 className="mt-2 text-4xl md:text-[2.75rem] font-semibold tracking-tight">Get a 90-Day Launch Plan</h1>
          <p className="mt-3 text-muted-foreground">
            Bring the idea. Leave with a clear 90-day launch path and execution priorities.
          </p>
        </div>

        {checkoutStatus === 'success' && (
          <Card className="border-green-200">
            <CardContent className="pt-6 text-sm text-green-700">
              Payment confirmed. Your complete launch plan delivery is now queued to your verified email.
            </CardContent>
          </Card>
        )}

        {checkoutStatus === 'canceled' && (
          <Card className="border-amber-200">
            <CardContent className="pt-6 text-sm text-amber-700">
              Checkout was canceled. Your strategy brief is still saved, and you can unlock again anytime.
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-red-700">{error}</p>
              {(step === 'idea' || step === 'clarify') && (
                <Button variant="outline" onClick={retryCurrentStep} disabled={loading}>
                  {voiceStrings.common.retryAction}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-800">Reviewing your idea</p>
              <div className="mt-3 grid gap-1 text-xs text-slate-600">
                <p>1. Finding the sharpest angle</p>
                <p>2. Mapping a 90-day launch path</p>
                <p>3. Drafting your launch plan preview</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'idea' && (
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Start with your idea</CardTitle>
              <CardDescription>
                Describe the idea in plain English. I&apos;ll ask at most two questions if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 overflow-visible">
              <div className="grid gap-6 md:grid-cols-12 md:items-start">
                <div className="space-y-4 md:col-span-7">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Describe the idea in plain English</label>
                    <Textarea
                      value={idea}
                      onChange={(event) => setIdea(event.target.value)}
                      className="min-h-72 text-[15px] leading-6 md:min-h-[360px] border-white/10 bg-white/5 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
                      placeholder="What are you building, who is it for, and why now?"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {IDEA_CATEGORY_CHIPS.map((chip) => {
                      const active = ideaCategory === chip.value
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                            active
                              ? 'bg-cyan-700 text-white ring-cyan-500/80'
                              : 'bg-white/5 text-muted-foreground ring-white/10 hover:text-white'
                          }`}
                          onClick={() =>
                            setIdeaCategory((prev) => (prev === chip.value ? null : chip.value))
                          }
                        >
                          {chip.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Button type="button" variant="outline" size="sm" onClick={() => setExamplesOpen(true)}>
                      Show examples
                    </Button>
                    <p className={canSubmitIdea ? 'text-muted-foreground' : 'text-amber-300/80'}>
                      {canSubmitIdea ? 'Looks good.' : 'Add a bit more detail (20+ characters) for a stronger plan.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 md:col-span-5 md:sticky md:top-24">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business type</label>
                      <Select value={bizType} onValueChange={(value) => setBizType(value as BizType)}>
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="unsure">Not sure yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(bizType === 'physical' || bizType === 'both') && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location(s)</label>
                        <Input
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          placeholder="City, State or multi-location"
                          className="border-white/10 bg-white/5 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Starting budget</label>
                      <Select
                        value={budgetRange}
                        onValueChange={(value) => setBudgetRange(value as BudgetRange)}
                      >
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="under500">Under $500</SelectItem>
                          <SelectItem value="500_2k">$500-$2k</SelectItem>
                          <SelectItem value="2k_10k">$2k-$10k</SelectItem>
                          <SelectItem value="10k_plus">$10k+</SelectItem>
                          <SelectItem value="unsure">Not sure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Timeline</label>
                      <Select value={timeline} onValueChange={(value) => setTimeline(value as Timeline)}>
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="14">2 weeks</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="flex">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Experience</label>
                      <Select value={experience} onValueChange={(value) => setExperience(value as Experience)}>
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="first_time">First-time</SelectItem>
                          <SelectItem value="built_before">Built before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Monetization</label>
                      <Select value={monetization} onValueChange={(value) => setMonetization(value as Monetization)}>
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="one_off">One-off</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                          <SelectItem value="unsure">Not sure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">What do you already have?</label>
                      <Select value={existingState} onValueChange={(value) => setExistingState(value as ExistingState)}>
                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="idea_only">Idea only</SelectItem>
                          <SelectItem value="waitlist">Waitlist</SelectItem>
                          <SelectItem value="mvp">MVP</SelectItem>
                          <SelectItem value="customers">Customers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your email</label>
                      <Input
                        type="email"
                        value={entryEmail}
                        onChange={(event) => setEntryEmail(event.target.value)}
                        placeholder="founder@company.com"
                        className="border-white/10 bg-white/5 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        We only use this to send your secure session link. No spam.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      One secure link. No passwords. Session resumes instantly.
                    </p>
                  </div>

                  <details className="overflow-visible rounded-lg border border-white/10 bg-white/5 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-white/90">
                      Optional tuning <span className="text-xs font-normal text-muted-foreground">(advanced)</span>
                    </summary>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Color direction</label>
                        <Select value={advanced.colorMode} onValueChange={handleColorModeChange}>
                          <SelectTrigger className="w-full border-white/10 bg-white/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[60]">
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
                          <SelectTrigger className="w-full border-white/10 bg-white/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[60]">
                            <SelectItem value="none">No preference</SelectItem>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="playful">Playful</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
                          <SelectTrigger className="w-full border-white/10 bg-white/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[60]">
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
                              setAdvanced((prev) => ({ ...prev, colorVibe: event.target.value }))
                            }
                            placeholder="Example: industrial confidence with warm highlights"
                            className="border-white/10 bg-white/5 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
                          />
                        </div>
                      )}

                      {advanced.colorMode === 'hex' && (
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Hex colors (max 3)</label>
                          <div className="flex gap-2">
                            <Input
                              value={hexDraft}
                              onChange={(event) => setHexDraft(event.target.value)}
                              placeholder="#112233"
                              className="border-white/10 bg-white/5 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/20"
                            />
                            <Button type="button" variant="outline" onClick={addHexColor}>
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {advanced.hexColors.map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:text-white"
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

                  <p className="text-xs text-muted-foreground">Powered by OMEGA. Secure. Private.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={submitIdea}
                  disabled={!canSubmitIdea || loading}
                  size="lg"
                  className="h-12 w-full bg-cyan-700 px-8 text-base text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-[1px] hover:bg-cyan-800"
                >
                  {loading ? 'Building Your Launch Plan...' : 'Build My 90-Day Launch Plan'}
                </Button>
              </div>
            </CardContent>

          </Card>
        )}

        {step === 'clarify' && (
          <Card>
            <CardHeader>
              <CardTitle>Two quick questions to tighten the plan</CardTitle>
              <CardDescription>
                Answer these to sharpen the launch plan preview. This is a single clarification round.
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

              <Button
                onClick={submitAnswers}
                disabled={loading || !traceId || answers.some((answer) => !answer.trim())}
              >
                {loading ? 'Generating Launch Plan Preview...' : 'Generate Launch Plan Preview'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'brief' && brief && (
          <Card>
            <CardHeader>
              <CardTitle>Your Launch Plan Preview</CardTitle>
              <CardDescription>
                Preview only. Unlock the complete launch plan after checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold">1. One-liner</h3>
                <p className="mt-2 text-sm leading-7">{brief.oneLiner}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">2. Positioning Snapshot</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{brief.positioning}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">3. ICP Snapshot</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{brief.icpSnapshot}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">4. Monetization Angle</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{brief.monetizationAngle}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">5. Strategic Differentiator</h3>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{brief.strategicDifferentiator}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold">6. Call to Action</h3>
                <p className="mt-2 text-sm leading-7">{brief.ctaHeadline}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{brief.ctaUnlockValue}</p>
              </section>

              <div className="rounded-sm border bg-muted p-5">
                <p className="text-sm font-medium">Complete Launch Plan Includes</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div>90-day go-to-market roadmap</div>
                  <div>Monetization structure and pricing posture</div>
                  <div>Channel strategy and execution stack</div>
                  <div>Offer design and conversion mechanics</div>
                </div>
              </div>

              <div className="space-y-2 rounded-sm border bg-muted p-4 text-xs text-muted-foreground">
                <p>Trace: {traceId || 'pending'}</p>
                <p>Receipt: {receiptRef || 'pending'}</p>
              </div>

              <Button
                size="lg"
                onClick={onUnlockClick}
                disabled={loading}
                className="h-12 w-full bg-cyan-700 px-8 text-base text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-[1px] hover:bg-cyan-800"
              >
                Unlock Complete Launch Plan - $69
              </Button>

              <div className="mt-6 text-center">
                <Button
                  onClick={generateBlueprint}
                  disabled={blueprintLoading}
                  className="bg-primary text-primary-foreground px-8 py-3 text-lg"
                >
                  {blueprintLoading ? 'Generating Blueprint...' : 'Generate Full Blueprint'}
                </Button>
                {blueprintError && (
                  <p className="mt-2 text-sm text-destructive">{blueprintError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'blueprint' && blueprint && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Launch Blueprint</h2>
            {/* Executive Thesis */}
            {(blueprint as Record<string, unknown>).executiveThesis && (
              <Card>
                <CardHeader><CardTitle>Executive Thesis</CardTitle></CardHeader>
                <CardContent><p>{String((blueprint as Record<string, unknown>).executiveThesis)}</p></CardContent>
              </Card>
            )}
            {/* Offer Architecture */}
            {(blueprint as Record<string, unknown>).offerArchitecture && (
              <Card>
                <CardHeader><CardTitle>Offer Architecture</CardTitle></CardHeader>
                <CardContent><p>{String((blueprint as Record<string, unknown>).offerArchitecture)}</p></CardContent>
              </Card>
            )}
            {/* 90-Day Plan */}
            {(blueprint as Record<string, unknown>).ninetyDayPlan && (
              <Card>
                <CardHeader><CardTitle>90-Day Plan</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><strong>Weeks 1-3:</strong> <p>{String(((blueprint as Record<string, unknown>).ninetyDayPlan as Record<string, unknown>).weeks1to3)}</p></div>
                  <div><strong>Weeks 4-8:</strong> <p>{String(((blueprint as Record<string, unknown>).ninetyDayPlan as Record<string, unknown>).weeks4to8)}</p></div>
                  <div><strong>Weeks 9-12:</strong> <p>{String(((blueprint as Record<string, unknown>).ninetyDayPlan as Record<string, unknown>).weeks9to12)}</p></div>
                </CardContent>
              </Card>
            )}
            {/* First Five Actions */}
            {Array.isArray((blueprint as Record<string, unknown>).firstFiveActions) && (
              <Card>
                <CardHeader><CardTitle>First Five Actions</CardTitle></CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2">
                    {((blueprint as Record<string, unknown>).firstFiveActions as string[]).map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
            {/* Distribution Strategy */}
            {(blueprint as Record<string, unknown>).distributionStrategy && (
              <Card>
                <CardHeader><CardTitle>Distribution Strategy</CardTitle></CardHeader>
                <CardContent><p>{String((blueprint as Record<string, unknown>).distributionStrategy)}</p></CardContent>
              </Card>
            )}
            {/* Monetization Model */}
            {(blueprint as Record<string, unknown>).monetizationModel && (
              <Card>
                <CardHeader><CardTitle>Monetization Model</CardTitle></CardHeader>
                <CardContent><p>{String((blueprint as Record<string, unknown>).monetizationModel)}</p></CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What you&apos;ll get in your launch plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>90-day launch roadmap with priorities by week.</p>
            <p>Channel strategy matched to your budget and timeline.</p>
            <p>Offer and monetization structure tuned to your model.</p>
            <p>Immediate execution moves for your first traction loop.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who this is for</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p>Founders moving from idea to first real launch plan.</p>
            <p>Operators who want a focused go-to-market path, not generic advice.</p>
            <p>Teams validating product, pricing, and demand in the next 90 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <section>
              <h3 className="font-medium text-foreground">What is included in the $69 launch plan?</h3>
              <p className="mt-1">You get a complete 90-day launch plan with positioning, monetization, channels, and execution priorities.</p>
            </section>
            <section>
              <h3 className="font-medium text-foreground">How long does the session take?</h3>
              <p className="mt-1">Most founders complete the intake in 5-10 minutes, including any clarification questions.</p>
            </section>
            <section>
              <h3 className="font-medium text-foreground">Will I need to answer a lot of follow-up questions?</h3>
              <p className="mt-1">No. I&apos;ll ask at most two questions if needed to tighten your plan.</p>
            </section>
            <section>
              <h3 className="font-medium text-foreground">Can this work for local and online businesses?</h3>
              <p className="mt-1">Yes. The session adapts strategy based on your business type, location constraints, and timeline.</p>
            </section>
          </CardContent>
        </Card>
      </div>

      {examplesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl border-white/15 bg-popover/95 backdrop-blur-md">
            <CardHeader>
              <CardTitle>High-signal examples</CardTitle>
              <CardDescription>Use these as a pattern for fast, useful input.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['saas', 'local', 'ecommerce'] as ExampleTab[]).map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    size="sm"
                    variant={examplesTab === tab ? 'default' : 'outline'}
                    onClick={() => setExamplesTab(tab)}
                  >
                    {EXAMPLES[tab].title}
                  </Button>
                ))}
              </div>
              <div className="rounded-lg border border-white/10 bg-background/95 p-4">
                <p className="text-sm leading-7">{EXAMPLES[examplesTab].example}</p>
                <p className="mt-3 text-xs text-muted-foreground">{EXAMPLES[examplesTab].why}</p>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setExamplesOpen(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {verificationRequired && verificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Check your email to continue</CardTitle>
              <CardDescription>
                {verificationMessage || 'We sent a secure link. Open it to continue your session.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entryEmail.trim() && (
                <p className="text-xs text-muted-foreground">
                  We sent a secure link to <span className="font-medium text-foreground">{entryEmail.trim().toLowerCase()}</span>.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This link expires shortly for security.
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: open your email app and tap the newest ForgePilot message.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resendVerificationLink}
                  disabled={loading || resendCooldownSeconds > 0}
                >
                  Resend link
                </Button>
                {resendCooldownSeconds > 0 && (
                  <p className="text-xs text-muted-foreground">You can resend in {resendCooldownSeconds}s</p>
                )}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setVerificationModalOpen(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Where should I send your launch plan?</CardTitle>
              <CardDescription>We&apos;ll verify your email before checkout.</CardDescription>
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
                  {emailStatusLoading ? voiceStrings.launch.verificationSendAction : 'Send Verification Link'}
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
