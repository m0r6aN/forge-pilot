import type { LaunchTraceState } from './runtime-store'

export interface ExportPolicyFailure {
  ok: false
  status: 402 | 409
  code: 'TRACE_LOCKED' | 'BLUEPRINT_NOT_READY' | 'BLUEPRINT_RECEIPT_REQUIRED'
  error: string
}

export interface ExportPolicySuccess {
  ok: true
}

export type ExportPolicyDecision = ExportPolicyFailure | ExportPolicySuccess

export function enforceBlueprintExportPolicy(
  trace: LaunchTraceState,
  receiptRef: string
): ExportPolicyDecision {
  if (trace.status !== 'unlocked') {
    return {
      ok: false,
      status: 402,
      code: 'TRACE_LOCKED',
      error: 'Payment required to export blueprint.',
    }
  }

  if (!trace.blueprint || !trace.blueprintReceiptRef) {
    return {
      ok: false,
      status: 409,
      code: 'BLUEPRINT_NOT_READY',
      error: 'Blueprint is still generating. Try again shortly.',
    }
  }

  if (receiptRef !== trace.blueprintReceiptRef) {
    return {
      ok: false,
      status: 409,
      code: 'BLUEPRINT_RECEIPT_REQUIRED',
      error: 'Unlocked traces require blueprint receiptRef for export.',
    }
  }

  return { ok: true }
}
