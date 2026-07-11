import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: 'deprecated_route',
      message: 'Continue via email link instead.',
      next: { action: 'continue', href: '/continue' },
    },
    { status: 410 }
  )
}
