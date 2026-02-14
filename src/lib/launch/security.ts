const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const idempotencyStore = new Map<string, { response: unknown; expiresAt: number }>()
const oneTimeTokenStore = new Map<string, number>()

function nowMs() {
  return Date.now()
}

function sweepExpired(map: Map<string, unknown>, isExpired: (value: unknown) => boolean) {
  for (const [key, value] of map.entries()) {
    if (isExpired(value)) {
      map.delete(key)
    }
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = nowMs()

  sweepExpired(rateLimitStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { resetAt: number }
    return item.resetAt <= now
  })

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  rateLimitStore.set(key, existing)

  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

export function getIdempotentResponse(key: string): unknown | null {
  const now = nowMs()

  sweepExpired(idempotencyStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { expiresAt: number }
    return item.expiresAt <= now
  })

  const existing = idempotencyStore.get(key)
  if (!existing) {
    return null
  }

  return existing.response
}

export function setIdempotentResponse(key: string, response: unknown, ttlMs: number) {
  idempotencyStore.set(key, {
    response,
    expiresAt: nowMs() + ttlMs,
  })
}

export function consumeOneTimeToken(tokenId: string, ttlMs: number): boolean {
  const now = nowMs()

  sweepExpired(oneTimeTokenStore as unknown as Map<string, unknown>, (value) => {
    return (value as number) <= now
  })

  const consumedUntil = oneTimeTokenStore.get(tokenId)
  if (consumedUntil && consumedUntil > now) {
    return false
  }

  oneTimeTokenStore.set(tokenId, now + ttlMs)
  return true
}
