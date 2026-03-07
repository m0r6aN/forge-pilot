import fs from 'fs'
import path from 'path'
import { buildReport, printReport, type VoiceFinding } from './report'
import { FAIL_PATTERNS, SCAN_EXTENSIONS, TARGET_DIRS, WARN_PATTERNS } from './rules'

type FailOn = 'critical' | 'warning'

function parseFailOn(argv: string[]): FailOn {
  const arg = argv.find((item) => item.startsWith('--fail-on=')) ?? '--fail-on=critical'
  const value = arg.split('=')[1]
  return value === 'warning' ? 'warning' : 'critical'
}

function isMarkdownFile(filePath: string): boolean {
  return filePath.endsWith('.md') || filePath.endsWith('.mdx')
}

function extractStringLiterals(content: string): string[] {
  const literals: string[] = []
  const pattern = /(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g
  let match: RegExpExecArray | null = null

  while ((match = pattern.exec(content)) !== null) {
    const raw = match[0]
    if (raw.startsWith('`') && raw.includes('${')) {
      continue
    }
    const unwrapped = raw.slice(1, -1).trim()
    if (unwrapped.length >= 3) {
      literals.push(unwrapped)
    }
  }

  return literals
}

function shouldScanFile(filePath: string): boolean {
  return SCAN_EXTENSIONS.has(path.extname(filePath))
}

function walk(dir: string, files: string[]): void {
  if (!fs.existsSync(dir)) {
    return
  }

  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (shouldScanFile(fullPath)) {
      files.push(fullPath)
    }
  }
}

function evaluateCandidate(filePath: string, text: string): VoiceFinding | null {
  const failMatches = FAIL_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => `Prohibited phrase detected: ${pattern.source}`
  )
  if (failMatches.length > 0) {
    return {
      filePath,
      severity: 'critical',
      result: 'REJECTED',
      violations: failMatches,
      snippet: text.slice(0, 140).replace(/\s+/g, ' '),
    }
  }

  const warnMatches = WARN_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => `Drift phrase detected: ${pattern.source}`
  )
  if (warnMatches.length === 0) {
    return null
  }
  return {
    filePath,
    severity: 'warning',
    result: 'REWRITE_REQUIRED',
    violations: warnMatches,
    snippet: text.slice(0, 140).replace(/\s+/g, ' '),
  }
}

function scanFile(filePath: string): VoiceFinding[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const findings: VoiceFinding[] = []
  if (isMarkdownFile(filePath)) {
    const finding = evaluateCandidate(filePath, content)
    if (finding) {
      findings.push(finding)
    }
    return findings
  }

  for (const literal of extractStringLiterals(content)) {
    const finding = evaluateCandidate(filePath, literal)
    if (finding) {
      findings.push(finding)
    }
  }
  return findings
}

function run(): void {
  const failOn = parseFailOn(process.argv.slice(2))
  const files: string[] = []
  for (const dir of TARGET_DIRS) {
    walk(dir, files)
  }

  const findings = files.flatMap((filePath) => scanFile(filePath))
  const report = buildReport(findings)
  printReport(report)

  const shouldFail =
    failOn === 'warning' ? report.criticalCount > 0 || report.warningCount > 0 : report.criticalCount > 0
  if (shouldFail) {
    process.exit(1)
  }
}

run()
