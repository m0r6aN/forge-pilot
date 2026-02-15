import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import {
  appendLedger,
  structuredInfo,
  upsertTrace,
  verifyTraceReceiptBinding,
} from '@/lib/launch/runtime-store'
import { renderDeterministicBlueprintPdf, renderDeterministicLaunchPdf } from '@/lib/launch/pdf'

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
    const startupName = trace.teaser?.oneLiner.split(' ').slice(0, 5).join(' ') || `Startup ${trace.traceId.slice(0, 8)}`

    let pdf: Buffer
    let format: 'teaser' | 'blueprint'

    if (trace.status === 'unlocked') {
      if (!trace.blueprint || !trace.blueprintReceiptRef) {
        return NextResponse.json({ error: 'Blueprint is not ready yet for this unlocked trace' }, { status: 409 })
      }

      if (receiptRef !== trace.blueprintReceiptRef) {
        return NextResponse.json(
          { error: 'Unlocked traces require blueprint receiptRef for export' },
          { status: 409 }
        )
      }

      pdf = renderDeterministicBlueprintPdf({
        startupName,
        traceId,
        workflowVersion: trace.blueprintWorkflowVersion || trace.workflowVersion,
        title: trace.blueprint.title,
        executiveThesis: trace.blueprint.executiveThesis,
        offerArchitecture: trace.blueprint.offerArchitecture,
        monetizationModel: trace.blueprint.monetizationModel,
        distributionStrategy: trace.blueprint.distributionStrategy,
        weeks1to3: trace.blueprint.ninetyDayPlan.weeks1to3,
        weeks4to8: trace.blueprint.ninetyDayPlan.weeks4to8,
        weeks9to12: trace.blueprint.ninetyDayPlan.weeks9to12,
        riskMitigation: trace.blueprint.riskMitigation,
        firstFiveActions: trace.blueprint.firstFiveActions,
        receiptRef,
      })
      format = 'blueprint'
    } else {
      if (!trace.teaser) {
        return NextResponse.json({ error: 'No teaser content exists for this trace' }, { status: 409 })
      }

      pdf = renderDeterministicLaunchPdf({
        startupName,
        tagline: trace.teaser.ctaHeadline,
        traceId,
        workflowVersion: trace.workflowVersion,
        problem: trace.teaser.positioning,
        solution: trace.teaser.strategicDifferentiator,
        targetMarket: trace.teaser.icpSnapshot,
        pricingStrategy: trace.teaser.monetizationAngle,
        goToMarket: trace.teaser.ctaUnlockValue,
        receiptRef,
      })
      format = 'teaser'
    }

    const pdfSha256 = createHash('sha256').update(pdf).digest('hex')

    trace.exports.push({
      receiptRef,
      pdfSha256,
      format,
      createdAt: new Date().toISOString(),
    })
    trace.updatedAt = new Date().toISOString()
    await upsertTrace(trace)

    await appendLedger({
      type: 'export.generated',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      meta: { pdfSha256, format },
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
