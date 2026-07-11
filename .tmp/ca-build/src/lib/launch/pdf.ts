function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }
    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines.length ? lines : ['']
}

interface ExportContent {
  startupName: string
  tagline: string
  traceId: string
  workflowVersion: string
  problem: string
  solution: string
  targetMarket: string
  pricingStrategy: string
  goToMarket: string
  receiptRef: string
}

interface BlueprintExportContent {
  startupName: string
  traceId: string
  workflowVersion: string
  title: string
  executiveThesis: string
  offerArchitecture: string
  monetizationModel: string
  distributionStrategy: string
  weeks1to3: string
  weeks4to8: string
  weeks9to12: string
  riskMitigation: string
  firstFiveActions: string[]
  receiptRef: string
}

export function renderDeterministicLaunchPdf(content: ExportContent): Buffer {
  const lines: string[] = []

  lines.push('BT /F1 28 Tf 72 730 Td (' + escapePdfText(content.startupName) + ') Tj ET')
  lines.push('BT /F1 14 Tf 72 700 Td (' + escapePdfText(content.tagline) + ') Tj ET')
  lines.push('BT /F1 11 Tf 72 676 Td (traceId: ' + escapePdfText(content.traceId) + ') Tj ET')
  lines.push('BT /F1 11 Tf 72 660 Td (workflowVersion: ' + escapePdfText(content.workflowVersion) + ') Tj ET')

  let cursorY = 620
  const sections = [
    ['Problem', content.problem],
    ['Solution', content.solution],
    ['Target Market', content.targetMarket],
    ['Pricing Strategy', content.pricingStrategy],
    ['Go-To-Market Outline', content.goToMarket],
  ] as const

  for (const [title, body] of sections) {
    lines.push(`BT /F1 14 Tf 72 ${cursorY} Td (` + escapePdfText(title) + ') Tj ET')
    cursorY -= 18
    for (const wrapped of wrapText(body, 88).slice(0, 8)) {
      lines.push(`BT /F1 10 Tf 72 ${cursorY} Td (` + escapePdfText(wrapped) + ') Tj ET')
      cursorY -= 14
    }
    cursorY -= 12
  }

  lines.push('BT /F1 8 Tf 72 38 Td (Generated under OMEGA Governed Execution) Tj ET')
  lines.push('BT /F1 8 Tf 72 26 Td (traceId: ' + escapePdfText(content.traceId) + ' | receiptRef: ' + escapePdfText(content.receiptRef) + ') Tj ET')

  const contentStream = lines.join('\n')
  const streamLength = Buffer.byteLength(contentStream, 'utf8')

  const objects: string[] = []
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj')
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj')
  objects.push(`5 0 obj << /Length ${streamLength} >> stream\n${contentStream}\nendstream endobj`)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${obj}\n`
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(pdf, 'utf8')
}

export function renderDeterministicBlueprintPdf(content: BlueprintExportContent): Buffer {
  const lines: string[] = []

  lines.push('BT /F1 24 Tf 72 730 Td (' + escapePdfText(content.startupName) + ') Tj ET')
  lines.push('BT /F1 14 Tf 72 706 Td (' + escapePdfText(content.title) + ') Tj ET')
  lines.push('BT /F1 10 Tf 72 688 Td (traceId: ' + escapePdfText(content.traceId) + ') Tj ET')
  lines.push('BT /F1 10 Tf 72 674 Td (workflowVersion: ' + escapePdfText(content.workflowVersion) + ') Tj ET')

  let cursorY = 646
  const sections = [
    ['Executive Thesis', content.executiveThesis, 7],
    ['Offer Architecture', content.offerArchitecture, 8],
    ['Monetization Model', content.monetizationModel, 7],
    ['Distribution Strategy', content.distributionStrategy, 7],
    ['90-Day Plan (Weeks 1-3)', content.weeks1to3, 5],
    ['90-Day Plan (Weeks 4-8)', content.weeks4to8, 5],
    ['90-Day Plan (Weeks 9-12)', content.weeks9to12, 5],
    ['Risk Mitigation', content.riskMitigation, 5],
    ['First Five Actions', content.firstFiveActions.join(' | '), 4],
  ] as const

  for (const [title, body, maxLines] of sections) {
    lines.push(`BT /F1 12 Tf 72 ${cursorY} Td (` + escapePdfText(title) + ') Tj ET')
    cursorY -= 16
    for (const wrapped of wrapText(body, 90).slice(0, maxLines)) {
      lines.push(`BT /F1 9 Tf 72 ${cursorY} Td (` + escapePdfText(wrapped) + ') Tj ET')
      cursorY -= 12
    }
    cursorY -= 8
    if (cursorY < 72) {
      break
    }
  }

  lines.push('BT /F1 8 Tf 72 38 Td (Generated under OMEGA Governed Execution) Tj ET')
  lines.push('BT /F1 8 Tf 72 26 Td (traceId: ' + escapePdfText(content.traceId) + ' | receiptRef: ' + escapePdfText(content.receiptRef) + ') Tj ET')

  const contentStream = lines.join('\n')
  const streamLength = Buffer.byteLength(contentStream, 'utf8')

  const objects: string[] = []
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj')
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj')
  objects.push(`5 0 obj << /Length ${streamLength} >> stream\n${contentStream}\nendstream endobj`)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${obj}\n`
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(pdf, 'utf8')
}
