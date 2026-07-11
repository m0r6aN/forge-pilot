import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const returnTo = new URL(req.url).searchParams.get('returnTo') || '/launch'
  const redirectPath = returnTo.startsWith('/') ? returnTo : '/launch'
  return NextResponse.redirect(new URL(`/continue?returnTo=${encodeURIComponent(redirectPath)}`, req.url))
}

export async function POST(req: NextRequest) {
  const returnTo = new URL(req.url).searchParams.get('returnTo') || '/launch'
  const redirectPath = returnTo.startsWith('/') ? returnTo : '/launch'
  return NextResponse.json({
    ok: false,
    code: 'deprecated_route',
    message: 'Continue via email link instead.',
    next: { action: 'continue', href: `/continue?returnTo=${encodeURIComponent(redirectPath)}` },
  }, { status: 410 })
}
