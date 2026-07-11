import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOmegaClient, generateCorrelationId } from '@omega/sdk'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const root = path.resolve(__dirname, '..')
  const workflowRoots = [
    {
      workflowId: 'forgepilot.teaser.v1',
      version: '1.0.0',
      artifactRoot: path.join(root, 'workflows', 'forgepilot', 'teaser.v1'),
    },
    {
      workflowId: 'forgepilot.blueprint.v1',
      version: '1.0.0',
      artifactRoot: path.join(root, 'workflows', 'forgepilot', 'blueprint.v1'),
    },
  ]

  const tenantId = requiredEnv('OMEGA_TENANT_ID')
  const actorId = requiredEnv('OMEGA_ACTOR_ID')
  const client = createOmegaClient({
    federationUrl: requiredEnv('OMEGA_FEDERATION_URL'),
    apiKey: requiredEnv('OMEGA_API_KEY'),
    tenantId,
    actorId,
    timeoutMs: Number(process.env.OMEGA_TIMEOUT_MS ?? 120_000),
    maxRetries: Number(process.env.OMEGA_MAX_RETRIES ?? 3),
  })

  const correlationId = generateCorrelationId(tenantId)
  const results = []
  for (const workflow of workflowRoots) {
    const workflowYaml = await fs.readFile(path.join(workflow.artifactRoot, 'workflow.yaml'), 'utf8')
    const promptsPoml = await fs.readFile(path.join(workflow.artifactRoot, 'prompts.poml'), 'utf8')

    const schemaDir = path.join(workflow.artifactRoot, 'schema')
    const schemas = {}
    const files = await fs.readdir(schemaDir, { recursive: true })
    for (const file of files) {
      if (typeof file !== 'string') continue
      if (!file.endsWith('.json')) continue
      const abs = path.join(schemaDir, file)
      const jsonText = await fs.readFile(abs, 'utf8')
      schemas[file.replace(/\\/g, '/')] = JSON.parse(jsonText)
    }

    const result = await client.workflows.register(
      {
        workflowYaml,
        promptsPoml,
        schemas,
        workflowId: workflow.workflowId,
        version: workflow.version,
      },
      {
        tenantId,
        actorId,
        correlationId,
      }
    )

    results.push({ correlationId, ...result })
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error('Failed to register workflow artifacts:', error)
  process.exitCode = 1
})
