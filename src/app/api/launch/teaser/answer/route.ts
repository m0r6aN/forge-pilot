import { NextRequest, NextResponse } from 'next/server'
import { isValidSessionId, normalizeAdvancedOptions } from '@/lib/launch/types'
import { runTeaserAnswerWorkflow } from '@/lib/omega/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    const answers = Array.isArray(body?.answers)
      ? body.answers.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    if (!answers.length) {
      return NextResponse.json({ error: 'At least one answer is required' }, { status: 400 })
    }

    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const advanced = normalizeAdvancedOptions(body?.advanced)

    const result = await runTeaserAnswerWorkflow({
      sessionId,
      idea,
      advanced,
      answers,
    })

    if (result.needs_clarification) {
      return NextResponse.json(
        { error: 'OMEGA requested another clarification round, which is not allowed in v1.' },
        { status: 502 }
      )
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
    console.error('Launch teaser answer processing failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : (error as Error)?.message,
      },
      { status: 502 }
    )
  }
}
