import { NextRequest, NextResponse } from 'next/server'
import { isValidSessionId, normalizeAdvancedOptions } from '@/lib/launch/types'
import { runTeaserStartWorkflow } from '@/lib/omega/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    const advanced = normalizeAdvancedOptions(body?.advanced)

    const result = await runTeaserStartWorkflow({
      sessionId,
      idea,
      advanced,
    })

    if (result.needs_clarification) {
      return NextResponse.json({
        needs_clarification: true,
        questions: (result.questions || []).slice(0, 2),
        traceId: result.traceId,
        receiptRef: result.receiptRef,
      })
    }

    if (!result.teaser || !result.receiptRef) {
      return NextResponse.json({ error: 'OMEGA did not return a valid teaser payload' }, { status: 502 })
    }

    return NextResponse.json({
      needs_clarification: false,
      teaser: result.teaser,
      traceId: result.traceId,
      receiptRef: result.receiptRef,
    })
  } catch (error) {
    console.error('Launch teaser generation failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : (error as Error)?.message,
      },
      { status: 502 }
    )
  }
}
