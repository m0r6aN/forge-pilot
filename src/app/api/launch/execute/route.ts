import { NextRequest, NextResponse } from 'next/server'
import { createOmegaClient, generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { getEnv } from '@/lib/config/env'

type PublishTarget = 'github' | 'landing'

interface LaunchExecutionRequest {
  idea: {
    id: string
    name: string
    description: string
    industry?: string
    targetMarket?: string
    uniqueValueProposition?: string
  }
  publishTarget?: PublishTarget
}

interface MarketOpsManifest {
  schema_version: string
  manifest_id: string
  generated_at: string
  source: 'forgepilot-launch-blueprint'
  campaign: {
    campaign_id: string
    status: string
  }
  blueprint: {
    idea_id: string
    name: string
    description: string
    industry?: string
    target_market?: string
    value_proposition?: string
  }
  execution: {
    publish_target: PublishTarget
    governance_mode: 'governed'
  }
}

function createClient() {
  const federationUrl = getEnv('OMEGA_FEDERATION_URL')
  const apiKey = getEnv('OMEGA_API_KEY')
  const tenantId = getEnv('OMEGA_TENANT_ID')
  const actorId = getEnv('OMEGA_ACTOR_ID')

  if (!federationUrl || !apiKey || !tenantId || !actorId) {
    throw new Error('Missing required OMEGA configuration for launch execution logging')
  }

  return createOmegaClient({
    federationUrl,
    apiKey,
    tenantId,
    actorId,
    timeoutMs: Number(process.env.OMEGA_TIMEOUT_MS ?? 120_000),
    maxRetries: Number(process.env.OMEGA_MAX_RETRIES ?? 3),
  })
}

async function logLaunchExecutionToOmega(payload: unknown): Promise<{ traceId: string; receiptRef: string }> {
  const tenantId = process.env.OMEGA_TENANT_ID
  const actorId = process.env.OMEGA_ACTOR_ID
  if (!tenantId || !actorId) {
    throw new Error('Missing OMEGA_TENANT_ID or OMEGA_ACTOR_ID')
  }

  const correlationId = generateCorrelationId(tenantId)
  validateCorrelationId(correlationId)
  const omega = createClient()

  const run = await omega.workflows.runWorkflow(
    'forgepilot.execution.beta.v1',
    { payload },
    { tenantId, actorId, correlationId }
  )

  const completed = await omega.workflows.waitForCompletion(run.runId, {
    tenantId,
    actorId,
    correlationId,
    pollIntervalMs: 1_000,
    timeoutMs: 60_000,
  })

  const traceId = completed.correlationId
  const receiptRef =
    completed.workflowReceiptHash ||
    (Array.isArray(completed.receiptChain) && completed.receiptChain.length > 0
      ? completed.receiptChain[completed.receiptChain.length - 1]
      : undefined)

  if (!traceId || !receiptRef) {
    throw new Error('OMEGA execution logger did not return traceId and receiptRef')
  }

  return { traceId, receiptRef }
}

function buildMarketOpsManifest(
  idea: LaunchExecutionRequest['idea'],
  campaign: any,
  publishTarget: PublishTarget
): MarketOpsManifest {
  return {
    schema_version: 'marketops/v1',
    manifest_id: `manifest_${Date.now()}`,
    generated_at: new Date().toISOString(),
    source: 'forgepilot-launch-blueprint',
    campaign: {
      campaign_id: campaign.campaign_id,
      status: campaign.status || 'created',
    },
    blueprint: {
      idea_id: idea.id,
      name: idea.name,
      description: idea.description,
      industry: idea.industry,
      target_market: idea.targetMarket,
      value_proposition: idea.uniqueValueProposition,
    },
    execution: {
      publish_target: publishTarget,
      governance_mode: 'governed',
    },
  }
}

async function sendToFederationCore(manifest: MarketOpsManifest) {
  const federationCoreUrl = getEnv('FEDERATION_CORE_URL')
  if (!federationCoreUrl) {
    return { submitted: false, reason: 'FEDERATION_CORE_URL not configured' }
  }

  const response = await fetch(`${federationCoreUrl}/marketops/manifests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Federation Core rejected manifest: ${response.status} ${errorText}`)
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // Best-effort parsing.
  }

  return {
    submitted: true,
    federationManifestId: payload?.manifest_id || manifest.manifest_id,
  }
}

async function publishWithGovernance(manifest: MarketOpsManifest, publishTarget: PublishTarget) {
  const endpoint =
    publishTarget === 'github'
      ? getEnv('GOVERNED_GITHUB_PUBLISHER_URL')
      : getEnv('GOVERNED_LANDING_PUBLISHER_URL')

  if (!endpoint) {
    return {
      published: false,
      reason:
        publishTarget === 'github'
          ? 'GOVERNED_GITHUB_PUBLISHER_URL not configured'
          : 'GOVERNED_LANDING_PUBLISHER_URL not configured',
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      governance: {
        mode: 'governed',
        source: 'forgepilot',
      },
      manifest,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Publisher failed: ${response.status} ${errorText}`)
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // Best-effort parsing.
  }

  return {
    published: true,
    publishUrl: payload?.url || payload?.preview_url || null,
    publicationId: payload?.id || null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LaunchExecutionRequest
    const publishTarget: PublishTarget = body.publishTarget || 'landing'
    const idea = body.idea

    if (!idea?.id || !idea?.name || !idea?.description) {
      return NextResponse.json({ error: 'Missing required idea fields' }, { status: 400 })
    }

    const fastApiBaseUrl =
      getEnv('OMEGA_BASE_URL') ||
      getEnv('FASTAPI_BASE_URL') ||
      getEnv('FORGEPILOT_BACKEND_URL') ||
      getEnv('NEXT_PUBLIC_FASTAPI_BASE_URL') ||
      'http://localhost:8010'

    const campaignResponse = await fetch(`${fastApiBaseUrl}/campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: idea.description,
        industry: idea.industry,
        target_audience: idea.targetMarket,
        special_requirements: ['launch-blueprint-beta-execution'],
      }),
    })

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text()
      return NextResponse.json(
        { error: `FastAPI campaign creation failed: ${campaignResponse.status} ${errorText}` },
        { status: 502 }
      )
    }

    const campaign = await campaignResponse.json()
    const manifest = buildMarketOpsManifest(idea, campaign, publishTarget)

    const [federationResult, publicationResult] = await Promise.allSettled([
      sendToFederationCore(manifest),
      publishWithGovernance(manifest, publishTarget),
    ])

    const federation =
      federationResult.status === 'fulfilled'
        ? federationResult.value
        : { submitted: false, reason: federationResult.reason?.message || 'submission failed' }

    const publication =
      publicationResult.status === 'fulfilled'
        ? publicationResult.value
        : { published: false, reason: publicationResult.reason?.message || 'publication failed' }

    const omegaExecutionLog = await logLaunchExecutionToOmega({
      idea,
      publishTarget,
      campaign: {
        campaignId: campaign.campaign_id,
        status: campaign.status || 'created',
      },
      manifest,
      federation,
      publication,
    })

    return NextResponse.json({
      success: true,
      message: 'Initial launch campaign execution started',
      campaign: {
        campaignId: campaign.campaign_id,
        status: campaign.status || 'created',
      },
      manifest,
      federation,
      publication,
      omega: omegaExecutionLog,
    })
  } catch (error) {
    console.error('Launch execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute initial launch campaign' },
      { status: 500 }
    )
  }
}
