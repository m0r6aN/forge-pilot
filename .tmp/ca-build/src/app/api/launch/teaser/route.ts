import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import { generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { isValidSessionId, normalizeAdvancedOptions } from '@/lib/launch/types'
import {
  ForgePilotTeaserOutputSchema,
  enforceReceiptRules,
  normalizeForgePilotTeaserOutputPayload,
} from '@/lib/contracts/forgepilot-teaser'
import {
  appendLedger,
  buildArtifactHash,
  hashJson,
  structuredInfo,
  upsertTrace,
} from '@/lib/launch/runtime-store'
import { checkRateLimit } from '@/lib/launch/security'
import { hashEmail, hashUserAgent } from '@/lib/launch/security'
import { extractOmegaErrorDiagnostics } from '@/lib/launch/omega-error'
import { runGovernedWorkflow } from '@/lib/omega/runGovernedWorkflow'
import { hydrateDomainProfile } from '@/lib/domain/hydrateDomainProfile'
import { resolveDomainKeyFromIdea, SEEDED_DOMAIN_KEYS } from '@/lib/domain/resolveDomainKey'
import { readVerifiedEmailSession } from '@/lib/auth/verified-email-session'
import { startMagicLinkFlow } from '@/lib/auth/magic-link'

const TEASER_WORKFLOW_ID = 'forgepilot.teaser.v1'
const TEMPORARY_TEASER_ERROR = "We hit a temporary issue generating your strategy preview. Let's try again."
const TEASER_PROMPT_PATH = path.join(process.cwd(), 'workflows', 'forgepilot', 'teaser.v1', 'prompts.poml')
const REQUIRED_OMEGA_ENV_KEYS = [
  'OMEGA_FEDERATION_URL',
  'OMEGA_API_KEY',
  'OMEGA_TENANT_ID',
] as const
let cachedPromptHash: string | null = null
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

class TeaserDomainBindingError extends Error {
  constructor(
    readonly code:
      | 'DOMAIN_PROFILE_STORE_NOT_CONFIGURED'
      | 'DOMAIN_PROFILE_MISSING_ACTIVE'
      | 'DOMAIN_PROFILE_ENRICHMENT_REQUIRED',
    message: string
  ) {
    super(message)
    this.name = 'TeaserDomainBindingError'
  }
}

function missingOmegaEnvKeys(): string[] {
  return REQUIRED_OMEGA_ENV_KEYS.filter((key) => !process.env[key])
}

async function resolveTeaserPromptHash(): Promise<string> {
  if (cachedPromptHash) {
    return cachedPromptHash
  }

  const raw = await readFile(TEASER_PROMPT_PATH, 'utf8')
  cachedPromptHash = createHash('sha256').update(raw).digest('hex')
  return cachedPromptHash
}

function hashIdea(idea: string): string {
  return createHash('sha256').update(idea.trim(), 'utf8').digest('hex')
}

function safeAdvancedSummary(input: ReturnType<typeof normalizeAdvancedOptions>) {
  return {
    colorMode: input.colorMode,
    hexColorCount: input.hexColors.length,
    hasColorVibe: Boolean(input.colorVibe),
    tone: input.tone ?? 'none',
    budget: input.budget ?? 'none',
  }
}

function structuredFailurePayload(code: string, diagnostics: Record<string, unknown>) {
  return {
    ok: false as const,
    code,
    message: TEMPORARY_TEASER_ERROR,
    error: {
      code,
      message: TEMPORARY_TEASER_ERROR,
      retryable: true,
    },
    details: process.env.NODE_ENV === 'production' ? undefined : diagnostics,
  }
}

function buildDomainProfileBinding(profile: NonNullable<Awaited<ReturnType<typeof hydrateDomainProfile>>>, domainKey: string) {
  return {
    schema_id: profile.schemaId,
    domain_key: domainKey,
    profile_id: profile.profileId,
    profile_version: profile.profileVersion,
    profile_payload_hash: profile.payloadHash,
    source: profile.source,
  }
}

function resolveReceiptRef(receiptHash?: string, receiptChain?: string[]): string | undefined {
  if (receiptHash) {
    return receiptHash
  }

  if (Array.isArray(receiptChain) && receiptChain.length > 0) {
    return receiptChain[receiptChain.length - 1]
  }

  return undefined
}

function payloadTeaserFromOutput(output: Extract<ReturnType<typeof ForgePilotTeaserOutputSchema.parse>, { kind: 'teaser' }>) {
  return {
    oneLiner: output.teaser.oneLiner,
    positioning: output.teaser.sections.positioning,
    icpSnapshot: output.teaser.sections.icpSnapshot,
    monetizationAngle: output.teaser.sections.monetizationAngle,
    strategicDifferentiator: output.teaser.sections.strategicDifferentiator,
    ctaHeadline: output.teaser.cta.headline,
    ctaUnlockValue: output.teaser.cta.unlockValue,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' && body.sessionId ? body.sessionId : randomUUID()
    const requestEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const email = requestEmail || undefined
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim()
    const userAgent = req.headers.get('user-agent') || 'unknown'

    if (!idea) {
      return NextResponse.json(
        { ok: false, code: 'invalid_request', message: 'Idea is required.' },
        { status: 400 }
      )
    }

    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        { ok: false, code: 'invalid_request', message: 'Valid sessionId is required.' },
        { status: 400 }
      )
    }

    const emailHashForRate = email && EMAIL_PATTERN.test(email) ? hashEmail(email) : `anonymous:${sessionId}`
    const uaHash = hashUserAgent(userAgent)
    const ipRate = checkRateLimit(`teaser:ip:${ip}`, 30, 15 * 60 * 1000)
    const emailRate = checkRateLimit(`teaser:email:${emailHashForRate}`, 20, 15 * 60 * 1000)
    const uaRate = checkRateLimit(`teaser:ua:${uaHash}`, 40, 15 * 60 * 1000)
    if (!ipRate.allowed || !emailRate.allowed || !uaRate.allowed) {
      const resetAt = Math.min(ipRate.resetAt, emailRate.resetAt, uaRate.resetAt)
      return NextResponse.json(
        {
          ok: false,
          code: 'rate_limited',
          message: 'Too many requests. Please wait before retrying.',
          retryAfterMs: Math.max(0, resetAt - Date.now()),
        },
        { status: 429 }
      )
    }

    const verifiedSession = readVerifiedEmailSession(req)
    if (!verifiedSession) {
      if (!email || !EMAIL_PATTERN.test(email)) {
        structuredInfo('teaser.verification_required', { sessionId, reason: 'missing_or_invalid_email' })
        return NextResponse.json({
          ok: true,
          code: 'verification_required',
          verification_required: true,
          message: 'Confirm your email to continue.',
          next: { action: 'continue', href: '/continue?returnTo=/launch' },
        })
      }

      const start = await startMagicLinkFlow({
        email,
        ip,
        userAgent,
        returnTo: typeof body?.returnTo === 'string' ? body.returnTo : '/launch',
        context: {
          flow: 'launch_teaser',
          sessionId,
        },
      })

      if (!start.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: start.status === 429 ? 'rate_limited' : 'verification_start_failed',
            message: start.error,
            retryAfterMs: 'retryAfterMs' in start ? start.retryAfterMs : undefined,
          },
          { status: start.status }
        )
      }

      structuredInfo('teaser.verification_required', { sessionId, reason: 'magic_link_sent' })
      return NextResponse.json({
        ok: true,
        code: 'verification_required',
        verification_required: true,
        message: 'Check your email to continue.',
        next: { action: 'check_email', href: '/continue?returnTo=/launch' },
      })
    }
    const actorEmail = verifiedSession.email

    const advancedOptions = normalizeAdvancedOptions(body?.advanced)
    const requestedDomainKey =
      typeof body?.domainKey === 'string' && body.domainKey.trim().length > 0
        ? body.domainKey.trim().toLowerCase()
        : undefined
    const schemaId =
      typeof body?.schemaId === 'string' && body.schemaId.trim().length > 0
        ? body.schemaId.trim()
        : process.env.DOMAIN_PROFILE_SCHEMA_ID || 'domain.schema.v1'
    const domainKey = requestedDomainKey || resolveDomainKeyFromIdea(idea)
    let hydratedDomainProfile: Awaited<ReturnType<typeof hydrateDomainProfile>> = null
    if (domainKey) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new TeaserDomainBindingError(
          'DOMAIN_PROFILE_STORE_NOT_CONFIGURED',
          'Fail-closed: domain profile store is not configured.'
        )
      }

      hydratedDomainProfile = await hydrateDomainProfile(domainKey, schemaId)
      if (!hydratedDomainProfile) {
        if (SEEDED_DOMAIN_KEYS.includes(domainKey)) {
          throw new TeaserDomainBindingError(
            'DOMAIN_PROFILE_MISSING_ACTIVE',
            `Fail-closed: no active seeded domain profile for ${domainKey}@${schemaId}.`
          )
        }

        structuredInfo('teaser.domain_profile.enrichment_requested', {
          domainKey,
          schemaId,
          sessionId,
        })
        throw new TeaserDomainBindingError(
          'DOMAIN_PROFILE_ENRICHMENT_REQUIRED',
          `Fail-closed: enrichment required for ${domainKey}@${schemaId}.`
        )
      }
    }

    const missingEnvKeys = missingOmegaEnvKeys()
    if (missingEnvKeys.length) {
      throw new Error(`Missing required env var(s): ${missingEnvKeys.join(',')}`)
    }

    structuredInfo('teaser.request.received', {
      sessionId,
      ideaLength: idea.length,
      hasEmail: Boolean(actorEmail),
      advanced: safeAdvancedSummary(advancedOptions),
      domainKey: domainKey ?? null,
      domainSchemaId: schemaId,
      domainProfileHydrated: Boolean(hydratedDomainProfile),
      ip,
    })

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = `email:${verifiedSession.emailHash}`
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    structuredInfo('teaser.omega.invoke', {
      workflowId: TEASER_WORKFLOW_ID,
      sessionId,
      correlationId,
      tenantId,
      actorId,
    })

    const promptHash = await resolveTeaserPromptHash()
    const domainProfileBinding = hydratedDomainProfile ? buildDomainProfileBinding(hydratedDomainProfile, domainKey as string) : null
    structuredInfo('teaser.run.started', {
      sessionId,
      emailHash: verifiedSession.emailHash,
      actorId,
      workflowId: TEASER_WORKFLOW_ID,
    })

    const governed = await runGovernedWorkflow({
      workflowId: TEASER_WORKFLOW_ID,
      input: {
        idea,
        advancedOptions,
        email: actorEmail,
        sessionId,
        verifiedActor: {
          emailHash: verifiedSession.emailHash,
          sessionId: verifiedSession.sessionId,
        },
        domainProfileContext: hydratedDomainProfile
          ? {
              domainKey,
              schemaId: hydratedDomainProfile.schemaId,
              profileId: hydratedDomainProfile.profileId,
              profileVersion: hydratedDomainProfile.profileVersion,
              payloadHash: hydratedDomainProfile.payloadHash,
              source: hydratedDomainProfile.source,
              profile: hydratedDomainProfile.payload,
            }
          : null,
      },
      context: {
        tenantId,
        actorId,
        correlationId,
      },
      archetype: 'co_founder',
      wait: {
        allowPaused: true,
      },
    })
    const completed = governed.run
    structuredInfo('teaser.omega.completed', {
      workflowId: TEASER_WORKFLOW_ID,
      runId: completed.runId,
      status: completed.status,
      correlationId: completed.correlationId,
    })

    const traceId = completed.correlationId
    if (!traceId) {
      throw new Error('Fail-closed: OMEGA workflow response missing traceId')
    }

    if (completed.status !== 'completed' && completed.status !== 'paused') {
      const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
      throw new Error(`OMEGA workflow failed: ${details}`)
    }

    const normalized = normalizeForgePilotTeaserOutputPayload(completed.outputPayload ?? {})
    if (normalized.adjustedFields.length) {
      structuredInfo('teaser.output.normalized', {
        runId: completed.runId,
        traceId: completed.correlationId,
        adjustedFields: normalized.adjustedFields,
      })
    }
    const output = ForgePilotTeaserOutputSchema.parse(normalized.payload)
    const outputHash = hashJson(normalized.payload)
    const modelId = output.diagnostics?.model
    const llmDomainMeta = output._meta?.domainProfileUsed
    const ideaHash = output.inputEcho?.ideaHash ?? hashIdea(idea)
    const receiptRef = resolveReceiptRef(completed.workflowReceiptHash, completed.receiptChain)
    const workflowVersion = output.version
    const artifactId = process.env.OMEGA_TEASER_ARTIFACT_ID || TEASER_WORKFLOW_ID
    const artifactHash = buildArtifactHash(artifactId, workflowVersion)
    const inputHash = hashJson({
      idea,
      advancedOptions,
      email: actorEmail,
      sessionId,
      verifiedActor: {
        emailHash: verifiedSession.emailHash,
        sessionId: verifiedSession.sessionId,
      },
      domainProfileContext: hydratedDomainProfile
        ? {
            domainKey,
            schemaId: hydratedDomainProfile.schemaId,
            profileId: hydratedDomainProfile.profileId,
            profileVersion: hydratedDomainProfile.profileVersion,
            payloadHash: hydratedDomainProfile.payloadHash,
            source: hydratedDomainProfile.source,
          }
        : null,
    })

    enforceReceiptRules(output, receiptRef)

    if (output.kind === 'clarify') {
      if (!completed.gateInfo?.gateId) {
        throw new Error('Fail-closed: clarify branch requires a resumable gateId')
      }

      await upsertTrace({
        traceId,
        sessionId,
        email: actorEmail,
        idea,
        domainProfileBinding,
        advancedOptions,
        clarificationAnswers: {},
        workflowVersion,
        artifactId,
        artifactHash,
        inputHash,
        status: 'clarify_pending',
        runId: completed.runId,
        gateId: completed.gateInfo.gateId,
        questions: output.clarification.questions,
        resumeRecords: {},
        receipts: receiptRef
          ? [{ receiptRef, class: 'intermediate', source: 'teaser', createdAt: new Date().toISOString() }]
          : [],
        payment: {},
        exports: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await appendLedger({
        type: 'teaser.clarify',
        traceId,
        at: new Date().toISOString(),
        code: 'FC-GATE-001',
        meta: {
          email_hash: verifiedSession.emailHash,
          session_id: verifiedSession.sessionId,
          domain_profile_binding: domainProfileBinding,
          inputHash,
          artifactId,
          artifactHash,
          runId: completed.runId,
          gateId: completed.gateInfo.gateId,
          behavioralScore: governed.behavioralScore,
        },
      })
      structuredInfo('teaser.clarify', { traceId })

      return NextResponse.json({
        ok: true,
        code: 'clarification_required',
        needs_clarification: true,
        questions: output.clarification.questions,
        traceId,
        workflowVersion,
      })
    }

    if (!receiptRef) {
      throw new Error('Fail-closed: teaser branch missing receiptRef')
    }

      const teaser = payloadTeaserFromOutput(output)
    const nowIso = new Date().toISOString()
    await upsertTrace({
      traceId,
      sessionId,
      email: actorEmail,
      idea,
      domainProfileBinding,
      advancedOptions,
      clarificationAnswers: {},
      workflowVersion,
      artifactId,
      artifactHash,
      inputHash,
      status: 'teaser_ready',
      teaser,
      successReceiptRef: receiptRef,
      resumeRecords: {},
      receipts: [{ receiptRef, class: 'success', source: 'teaser', createdAt: nowIso }],
      payment: {},
      exports: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    await appendLedger({
      type: 'teaser.generated',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      code: 'FC-GATE-002',
      meta: {
        idea_hash: ideaHash,
        workflow_id: TEASER_WORKFLOW_ID,
        workflow_version: workflowVersion,
        email_hash: verifiedSession.emailHash,
        session_id: verifiedSession.sessionId,
        domain_profile_binding: domainProfileBinding,
        llm_domain_profile_meta: llmDomainMeta,
        prompt_hash: promptHash,
        model_id: modelId,
        output_hash: outputHash,
        binding: {
          omega_receipt_ref: receiptRef,
          idea_hash: ideaHash,
          domain_profile: domainProfileBinding
            ? {
                schema_id: domainProfileBinding.schema_id,
                domain_key: domainProfileBinding.domain_key,
                profile_id: domainProfileBinding.profile_id,
                profile_version: domainProfileBinding.profile_version,
                payload_hash: domainProfileBinding.profile_payload_hash,
                source: domainProfileBinding.source,
              }
            : null,
          prompt_hash: promptHash,
          output_hash: outputHash,
        },
        binding_hash: hashJson({
          omega_receipt_ref: receiptRef,
          idea_hash: ideaHash,
          domain_profile: domainProfileBinding
            ? {
                schema_id: domainProfileBinding.schema_id,
                domain_key: domainProfileBinding.domain_key,
                profile_id: domainProfileBinding.profile_id,
                profile_version: domainProfileBinding.profile_version,
                payload_hash: domainProfileBinding.profile_payload_hash,
                source: domainProfileBinding.source,
              }
            : null,
          prompt_hash: promptHash,
          output_hash: outputHash,
        }),
        inputHash,
        artifactId,
        artifactHash,
        behavioralScore: governed.behavioralScore,
      },
    })
    structuredInfo('teaser.generated', { traceId, receiptRef })

    return NextResponse.json({
      ok: true,
      code: 'teaser_generated',
      needs_clarification: false,
      teaser,
      traceId,
      receiptRef,
      workflowVersion,
    })
  } catch (error) {
    const diagnostics = extractOmegaErrorDiagnostics(error)
    let code = 'OMEGA_TEASER_FAILED'
    if (error instanceof TeaserDomainBindingError) {
      code = error.code
    } else if (typeof diagnostics.message === 'string' && diagnostics.message.includes('Missing required env var')) {
      code = 'OMEGA_ENV_MISSING'
    }
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'teaser.error',
        code,
        diagnostics,
      })
    )
    return NextResponse.json(structuredFailurePayload(code, diagnostics), { status: 200 })
  }
}
