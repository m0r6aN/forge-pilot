export type FindingSeverity = 'critical' | 'warning'

export interface VoiceFinding {
  filePath: string
  severity: FindingSeverity
  result: 'REJECTED' | 'REWRITE_REQUIRED'
  violations: string[]
  snippet?: string
}

export interface VoiceReport {
  findings: VoiceFinding[]
  criticalCount: number
  warningCount: number
}

export function buildReport(findings: VoiceFinding[]): VoiceReport {
  const criticalCount = findings.filter((item) => item.severity === 'critical').length
  const warningCount = findings.filter((item) => item.severity === 'warning').length
  return { findings, criticalCount, warningCount }
}

export function printReport(report: VoiceReport): void {
  for (const finding of report.findings) {
    const marker = finding.severity === 'critical' ? 'FAIL' : 'WARN'
    const details = finding.violations.join(' | ')
    const snippet = finding.snippet ? ` :: "${finding.snippet}"` : ''
    console.log(`[${marker}] ${finding.filePath} -> ${details}${snippet}`)
  }

  console.log(`Voice lint summary: ${report.criticalCount} critical, ${report.warningCount} warnings`)
}
