import { createHash, randomBytes } from 'crypto'

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const idempotencyStore = new Map<string, { response: unknown; expiresAt: number }>()
const oneTimeTokenStore = new Map<string, number>()
const magicLinkStore = new Map<
  string,
  {
    email: string
    emailHash: string
    stateHash: string
    returnTo: string
    context: Record<string, unknown> | null
    createdAt: number
    expiresAt: number
    consumedAt?: number
    ipHash: string
    userAgentHash: string
  }
>()
const resumeCodeStore = new Map<
  string,
  {
    email: string
    emailHash: string
    returnTo: string
    issuedAt: number
    expiresAt: number
  }
>()

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

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase())
}

export function hashIp(ip: string): string {
  return sha256(ip.trim())
}

export function hashUserAgent(userAgent: string): string {
  return sha256(userAgent.trim())
}

export function issueMagicLinkToken(params: {
  email: string
  returnTo: string
  context?: Record<string, unknown> | null
  state: string
  ttlMs: number
  ip: string
  userAgent: string
}): string {
  const now = nowMs()
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = sha256(rawToken)

  sweepExpired(magicLinkStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { expiresAt: number }
    return item.expiresAt <= now
  })

  magicLinkStore.set(tokenHash, {
    email: params.email.trim().toLowerCase(),
    emailHash: hashEmail(params.email),
    stateHash: sha256(params.state),
    returnTo: params.returnTo,
    context: params.context || null,
    createdAt: now,
    expiresAt: now + params.ttlMs,
    ipHash: hashIp(params.ip),
    userAgentHash: hashUserAgent(params.userAgent),
  })

  return rawToken
}

export function consumeMagicLinkToken(params: { token: string; state: string }) {
  const now = nowMs()
  const tokenHash = sha256(params.token)
  const stateHash = sha256(params.state)

  sweepExpired(magicLinkStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { expiresAt: number }
    return item.expiresAt <= now
  })

  const existing = magicLinkStore.get(tokenHash)
  if (!existing) {
    return { ok: false as const, reason: 'missing' as const }
  }

  if (existing.consumedAt) {
    return { ok: false as const, reason: 'consumed' as const }
  }

  if (existing.expiresAt <= now) {
    return { ok: false as const, reason: 'expired' as const }
  }

  if (existing.stateHash !== stateHash) {
    return { ok: false as const, reason: 'invalid_state' as const }
  }

  // Single-use semantics: consume by removing the record atomically in this sync path.
  magicLinkStore.delete(tokenHash)

  return {
    ok: true as const,
    record: {
      email: existing.email,
      emailHash: existing.emailHash,
      returnTo: existing.returnTo,
      context: existing.context,
      createdAt: existing.createdAt,
      ipHash: existing.ipHash,
      userAgentHash: existing.userAgentHash,
    },
  }
}

export function issueResumeCode(input: {
  email: string
  returnTo: string
  ttlMs: number
}): string {
  const now = nowMs()
  const code = randomBytes(4).toString('hex').toUpperCase()
  const codeHash = sha256(code)

  sweepExpired(resumeCodeStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { expiresAt: number }
    return item.expiresAt <= now
  })

  resumeCodeStore.set(codeHash, {
    email: input.email.trim().toLowerCase(),
    emailHash: hashEmail(input.email),
    returnTo: input.returnTo,
    issuedAt: now,
    expiresAt: now + input.ttlMs,
  })

  return code
}

export function consumeResumeCode(code: string) {
  const now = nowMs()
  const codeHash = sha256(code.trim().toUpperCase())

  sweepExpired(resumeCodeStore as unknown as Map<string, unknown>, (value) => {
    const item = value as { expiresAt: number }
    return item.expiresAt <= now
  })

  const entry = resumeCodeStore.get(codeHash)
  if (!entry) {
    return { ok: false as const, reason: 'invalid_or_expired' as const }
  }

  resumeCodeStore.delete(codeHash)

  return {
    ok: true as const,
    record: {
      email: entry.email,
      emailHash: entry.emailHash,
      returnTo: entry.returnTo,
      issuedAt: entry.issuedAt,
    },
  }
}

export function __resetSecurityStoresForTests() {
  rateLimitStore.clear()
  idempotencyStore.clear()
  oneTimeTokenStore.clear()
  magicLinkStore.clear()
  resumeCodeStore.clear()
}
