import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/generator', '/settings', '/brands', '/business-execution', '/analytics', '/team']
// Auth routes that authenticated users should be redirected from
const authRoutes = ['/auth', '/login', '/register']

function verifyToken(token: string, secret: string): { valid: boolean; expired: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, secret)
    return { valid: true, expired: false, payload }
  } catch (error) {
    if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
      return { valid: false, expired: true }
    }
    return { valid: false, expired: false }
  }
}

export function proxy(request: NextRequest) {
  // Check for JWT_SECRET configuration
  if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not configured')
    // In production, we should fail safely
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/error?code=config', request.url))
    }
  }

  const accessToken = request.cookies.get('auth-token')?.value
  const refreshToken = request.cookies.get('refresh-token')?.value
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Handle protected routes
  if (isProtectedRoute) {
    // No tokens at all
    if (!accessToken && !refreshToken) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check access token first
    if (accessToken && JWT_SECRET) {
      const result = verifyToken(accessToken, JWT_SECRET)
      if (result.valid) {
        return NextResponse.next()
      }
      
      // If access token is expired but we have a refresh token, let the request through
      // The API route will handle token refresh
      if (result.expired && refreshToken) {
        return NextResponse.next()
      }
    }

    // Only refresh token exists - let request through for API to handle refresh
    if (refreshToken && JWT_REFRESH_SECRET) {
      const result = verifyToken(refreshToken, JWT_REFRESH_SECRET)
      if (result.valid) {
        return NextResponse.next()
      }
    }

    // All tokens invalid
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    redirectUrl.searchParams.set('reason', 'session_expired')
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && accessToken && JWT_SECRET) {
    const result = verifyToken(accessToken, JWT_SECRET)
    if (result.valid) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public folder assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'
  ],
}
