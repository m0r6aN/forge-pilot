import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  // Protected routes
  const protectedRoutes = ['/dashboard', '/generator', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Verify token for protected routes
  if (isProtectedRoute && token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    } catch (error) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/auth') && token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      // Invalid token, continue to auth page
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}