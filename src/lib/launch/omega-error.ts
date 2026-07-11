import { OmegaError } from '@omega/sdk'

function asText(value: unknown, max = 1000): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return value.length > max ? `${value.slice(0, max)}...` : value
}

export function extractOmegaErrorDiagnostics(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: 'Unknown non-Error thrown value' }
  }

  const base: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stackPreview: asText(error.stack, 1200),
  }

  const asAny = error as unknown as Record<string, unknown>
  if (typeof asAny.code === 'string') {
    base.code = asAny.code
  }
  if (typeof asAny.retryable === 'boolean') {
    base.retryable = asAny.retryable
  }
  if (typeof asAny.correlationId === 'string') {
    base.correlationId = asAny.correlationId
  }
  if (typeof asAny.requestId === 'string') {
    base.requestId = asAny.requestId
  }
  if (asAny.details && typeof asAny.details === 'object') {
    const details = asAny.details as Record<string, unknown>
    base.details = details
    base.rawContentPreview = asText(details.rawContent)
  }

  if (error instanceof OmegaError) {
    const details = error.details || {}
    const rawContent = details.rawContent
    base.code = error.code
    base.retryable = error.retryable
    base.correlationId = error.correlationId
    base.requestId = error.requestId
    base.rawContentPreview = asText(rawContent)
  }

  if (error.cause instanceof Error) {
    base.cause = {
      name: error.cause.name,
      message: error.cause.message,
      stackPreview: asText(error.cause.stack, 800),
    }
  }

  return base
}
