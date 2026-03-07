import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import {
  appendLedger,
  structuredInfo,
  upsertTrace,
  verifyTraceReceiptBinding,
} from '@/lib/launch/runtime-store'
import { renderDeterministicBlueprintPdf } from '@/lib/launch/pdf'
import { enforceBlueprintExportPolicy } from '@/lib/launch/export-policy'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const traceId = typeof body?.traceId === 'string' ? body.traceId.trim() : ''
    const receiptRef = typeof body?.receiptRef === 'string' ? body.receiptRef.trim() : ''

    if (!traceId) {
      return NextResponse.json({ error: 'traceId is required' }, { status: 400 })
    }

    if (!receiptRef) {
      return NextResponse.json({ error: 'receiptRef is required' }, { status: 400 })
    }

    const binding = await verifyTraceReceiptBinding(traceId, receiptRef, {
      requireSuccess: true,
      rejectRevoked: true,
    })

    if (!binding.ok) {
      return NextResponse.json({ error: binding.reason }, { status: binding.status })
    }

    const trace = binding.trace
    const decision = enforceBlueprintExportPolicy(trace, receiptRef)
    if (!decision.ok) {
      return NextResponse.json({ code: decision.code, error: decision.error }, { status: decision.status })
    }

    const startupName = trace.teaser?.oneLiner.split(' ').slice(0, 5).join(' ') || `Startup ${trace.traceId.slice(0, 8)}`
    const blueprint = trace.blueprint
    if (!blueprint) {
      return NextResponse.json(
        { code: 'BLUEPRINT_NOT_READY', error: 'Blueprint is still generating. Try again shortly.' },
        { status: 409 }
      )
    }
    const pdf = renderDeterministicBlueprintPdf({
      startupName,
      traceId,
      workflowVersion: trace.blueprintWorkflowVersion || trace.workflowVersion,
      title: blueprint.title,
      executiveThesis: blueprint.executiveThesis,
      offerArchitecture: blueprint.offerArchitecture,
      monetizationModel: blueprint.monetizationModel,
      distributionStrategy: blueprint.distributionStrategy,
      weeks1to3: blueprint.ninetyDayPlan.weeks1to3,
      weeks4to8: blueprint.ninetyDayPlan.weeks4to8,
      weeks9to12: blueprint.ninetyDayPlan.weeks9to12,
      riskMitigation: blueprint.riskMitigation,
      firstFiveActions: blueprint.firstFiveActions,
      receiptRef,
    })

    const pdfSha256 = createHash('sha256').update(pdf).digest('hex')

    trace.exports.push({
      receiptRef,
      pdfSha256,
      format: 'blueprint',
      createdAt: new Date().toISOString(),
    })
    trace.updatedAt = new Date().toISOString()
    await upsertTrace(trace)

    await appendLedger({
      type: 'export.generated',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      meta: { pdfSha256, format: 'blueprint' },
    })
    structuredInfo('export.generated', { traceId, receiptRef })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="forgepilot-${traceId}.pdf"`,
        'X-Export-Sha256': pdfSha256,
      },
    })
  } catch (error) {
    console.error('Launch export generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
