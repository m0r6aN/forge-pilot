import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET

export interface JWTPayload {
  userId: string
  email: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type')
    }
    
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    }
    throw error
  }
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type')
    }
    
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    }
    throw error
  }
}

/**
 * Generate a new access token
 */
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
}

/**
 * Generate a new refresh token
 */
export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Decode a token without verifying (useful for reading expired tokens)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}
