import 'dotenv/config';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { exec as execCb, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import Stripe from 'stripe';
import { createClient as createRedisClient } from 'redis';

const exec = promisify(execCb);
const root = process.cwd();
const outDir = path.join(root, '.tmp', 'smoke-hostile');
await fs.mkdir(outDir, { recursive: true });

const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_smoke_local';
const redisUrl = process.env.REDIS_URL || process.env.FORGEPILOT_REDIS_URL || 'redis://127.0.0.1:6379';
const now = new Date();

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function requestJson(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), text, json: safeJsonParse(text) };
}

async function waitFor(fn, timeoutMs, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

function summarize(status, expected) {
  const pass = expected(status);
  return { pass, expected: expected.toString(), actual: String(status) };
}

async function readRuntimeTrace(traceId) {
  const runtimePath = path.join(root, '.tmp', 'forgepilot-launch-runtime.json');
  try {
    const raw = await fs.readFile(runtimePath, 'utf8');
    const db = JSON.parse(raw);
    return db?.traces?.[traceId] ?? null;
  } catch {
    return null;
  }
}

async function readLedgerEntries(traceId) {
  const ledgerPath = path.join(root, '.tmp', 'forgepilot-launch-ledger.jsonl');
  try {
    const raw = await fs.readFile(ledgerPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean).filter((e) => e.traceId === traceId);
  } catch {
    return [];
  }
}

async function run() {
  const evidence = {
    metadata: {},
    steps: {},
    requests: {},
    responses: {},
    notes: [],
  };

  const gitSha = (await exec('git rev-parse --short HEAD')).stdout.trim();
  const sdkSha = (await exec('git -C ../omega-sdk-ts rev-parse --short HEAD')).stdout.trim();
  const fcImage = (await exec('docker inspect federation_core --format "{{.Config.Image}}"')).stdout.trim();
  const fcDigest = (await exec('docker inspect federation_core --format "{{.Image}}"')).stdout.trim();
  const sdkTarPath = path.join(root, '..', 'omega-sdk-ts', 'omega-sdk-1.0.0.tgz');
  const sdkTar = await fs.readFile(sdkTarPath);
  const sdkTarHash = createHash('sha256').update(sdkTar).digest('hex');

  evidence.metadata = {
    localTime: now.toString(),
    utcTime: now.toISOString(),
    baseUrl,
    gitSha,
    sdkSha,
    sdkTarball: 'omega-sdk-1.0.0.tgz',
    sdkTarHash,
    fcImage,
    fcDigest,
  };

  // A) Register workflows
  const stepAStart = Date.now();
  const reg = await exec('node -r dotenv/config scripts/omega-register.mjs', { cwd: root, env: process.env, maxBuffer: 1024 * 1024 * 10 });
  const regJson = safeJsonParse(reg.stdout);
  evidence.steps.A = {
    command: 'node -r dotenv/config scripts/omega-register.mjs',
    status: regJson ? 200 : 500,
    durationMs: Date.now() - stepAStart,
    pass: Array.isArray(regJson) && regJson.length >= 2,
    result: regJson,
  };

  // B) Teaser run
  const sessionB = randomUUID();
  const teaserReq = { idea: 'AI compliance copilot for SMB HR teams', email: 'smoke-runner@example.com', sessionId: sessionB };
  const teaserRes = await requestJson('POST', `${baseUrl}/api/launch/teaser`, teaserReq);
  const teaserTrace = teaserRes.json?.traceId || null;
  const teaserReceipt = teaserRes.json?.receiptRef || null;
  evidence.steps.B = {
    request: teaserReq,
    status: teaserRes.status,
    traceId: teaserTrace,
    receiptRef: teaserReceipt,
    pass: teaserRes.status === 200 && !!teaserTrace,
  };
  evidence.responses.B = teaserRes;

  // C) Clarification + resume
  let clarifyRes = null;
  let clarifyReq = null;
  for (const prompt of ['Something with AI for marketing', 'AI tool', 'business idea with automation']) {
    const req = { idea: prompt, email: 'smoke-runner@example.com', sessionId: randomUUID() };
    const res = await requestJson('POST', `${baseUrl}/api/launch/teaser`, req);
    if (res.json?.needs_clarification === true) {
      clarifyReq = req;
      clarifyRes = res;
      break;
    }
  }

  let answerRes = null;
  let clarifyTrace = null;
  let clarifyReceipt = null;
  if (clarifyRes) {
    clarifyTrace = clarifyRes.json?.traceId || null;
    const answerReq = {
      traceId: clarifyTrace,
      answers: {
        targetCustomer: 'B2B SaaS founders',
        priceRange: '$49-$199/mo',
      },
    };
    answerRes = await requestJson('POST', `${baseUrl}/api/launch/teaser/answer`, answerReq);
    clarifyReceipt = answerRes.json?.receiptRef || null;
    evidence.steps.C = {
      requestInitial: clarifyReq,
      responseInitialStatus: clarifyRes.status,
      initialTraceId: clarifyTrace,
      requestResume: answerReq,
      responseResumeStatus: answerRes.status,
      responseResumeTraceId: answerRes.json?.traceId || null,
      receiptRef: clarifyReceipt,
      pass: clarifyRes.status === 200 && answerRes.status === 200 && answerRes.json?.traceId === clarifyTrace,
    };
    evidence.responses.C = { clarifyRes, answerRes };
  } else {
    evidence.steps.C = {
      pass: false,
      reason: 'Could not trigger clarification branch in 3 attempts',
    };
  }

  // E) Payment unlock via synthetic signed Stripe webhook (using teaser trace)
  const traceForBlueprint = teaserTrace;
  const receiptForBlueprint = teaserReceipt;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2025-12-15.clover' });
  const eventObj = {
    id: `evt_smoke_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_smoke_${Date.now()}`,
        object: 'checkout.session',
        metadata: {
          traceId: traceForBlueprint,
          receiptRef: receiptForBlueprint,
          workflowVersion: '1.0.0',
          email: 'smoke-runner@example.com',
        },
        customer_details: {
          email: 'smoke-runner@example.com',
        },
      },
    },
  };
  const payload = JSON.stringify(eventObj);
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const webhookRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body: payload,
  });
  const webhookText = await webhookRes.text();
  evidence.steps.E = {
    request: { type: eventObj.type, traceId: traceForBlueprint, receiptRef: receiptForBlueprint },
    status: webhookRes.status,
    pass: webhookRes.status === 200,
    responseText: webhookText,
  };

  // D) Export before blueprint ready should fail closed after unlock
  const exportBeforeReq = { traceId: traceForBlueprint, receiptRef: receiptForBlueprint };
  const exportBeforeRes = await fetch(`${baseUrl}/api/launch/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportBeforeReq),
  });
  const exportBeforeText = await exportBeforeRes.text();
  evidence.steps.D = {
    request: exportBeforeReq,
    status: exportBeforeRes.status,
    pass: exportBeforeRes.status === 409,
    responseText: exportBeforeText,
  };

  // F) Worker durability: start worker, kill, restart, ensure completion
  const workerLog = path.join(outDir, 'worker.log');
  const workerErrLog = path.join(outDir, 'worker.err.log');
  const streamOut = createWriteStream(workerLog, { flags: 'a' });
  const streamErr = createWriteStream(workerErrLog, { flags: 'a' });

  const worker1 = spawn('cmd.exe', ['/c', 'npm run omega:blueprint-worker'], {
    cwd: root,
    env: process.env,
    windowsHide: true,
  });
  worker1.stdout.pipe(streamOut);
  worker1.stderr.pipe(streamErr);
  await new Promise((r) => setTimeout(r, 1200));
  if (worker1.pid) {
    await exec(`taskkill /PID ${worker1.pid} /T /F`);
  }

  const redis = createRedisClient({ url: redisUrl });
  let redisConnected = false;
  let pendingAfterKill = null;
  try {
    await redis.connect();
    redisConnected = true;
    pendingAfterKill = await redis.xPending('omega.forgepilot.blueprint.requested.v1', 'forgepilot-blueprint-workers');
  } catch {
    pendingAfterKill = null;
  }

  const worker2 = spawn('cmd.exe', ['/c', 'npm run omega:blueprint-worker'], {
    cwd: root,
    env: process.env,
    windowsHide: true,
  });
  worker2.stdout.pipe(streamOut);
  worker2.stderr.pipe(streamErr);

  const completedTrace = await waitFor(async () => {
    if (!traceForBlueprint) return null;
    const t = await readRuntimeTrace(traceForBlueprint);
    if (t?.blueprint && t?.blueprintReceiptRef) return t;
    return null;
  }, 210000, 2000);

  let pendingAfterRestart = null;
  if (redisConnected) {
    try {
      pendingAfterRestart = await redis.xPending('omega.forgepilot.blueprint.requested.v1', 'forgepilot-blueprint-workers');
    } catch {
      pendingAfterRestart = null;
    }
    await redis.quit();
  }

  if (worker2.pid) {
    await exec(`taskkill /PID ${worker2.pid} /T /F`);
  }
  streamOut.end();
  streamErr.end();

  evidence.steps.F = {
    workerKilled: true,
    redisConnected,
    pendingAfterKill,
    pendingAfterRestart,
    completed: !!completedTrace,
    pass: !!completedTrace,
  };

  const blueprintReceipt = completedTrace?.blueprintReceiptRef || null;

  // G) Export blueprint + receipt mismatch check
  let exportBlueprintStatus = null;
  let exportBlueprintHeaders = null;
  let mismatchStatus = null;
  if (traceForBlueprint && blueprintReceipt) {
    const exportOk = await fetch(`${baseUrl}/api/launch/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId: traceForBlueprint, receiptRef: blueprintReceipt }),
    });
    exportBlueprintStatus = exportOk.status;
    exportBlueprintHeaders = Object.fromEntries(exportOk.headers.entries());
    await exportOk.arrayBuffer();

    const mismatch = await fetch(`${baseUrl}/api/launch/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId: traceForBlueprint, receiptRef: receiptForBlueprint }),
    });
    mismatchStatus = mismatch.status;
    await mismatch.text();
  }

  evidence.steps.G = {
    traceId: traceForBlueprint,
    teaserReceiptRef: receiptForBlueprint,
    blueprintReceiptRef: blueprintReceipt,
    exportBlueprintStatus,
    exportMismatchStatus: mismatchStatus,
    receiptsDistinct: !!blueprintReceipt && blueprintReceipt !== receiptForBlueprint,
    pass: exportBlueprintStatus === 200 && mismatchStatus === 409 && !!blueprintReceipt && blueprintReceipt !== receiptForBlueprint,
    workflowVersion: completedTrace?.blueprintWorkflowVersion || null,
  };

  // H) Replay safety: resend same webhook
  const replayRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body: payload,
  });
  const replayText = await replayRes.text();

  const traceAfterReplay = traceForBlueprint ? await readRuntimeTrace(traceForBlueprint) : null;
  const ledger = traceForBlueprint ? await readLedgerEntries(traceForBlueprint) : [];
  const blueprintGeneratedCount = ledger.filter((e) => e.type === 'blueprint.generated').length;

  evidence.steps.H = {
    status: replayRes.status,
    responseText: replayText,
    blueprintGeneratedCount,
    pass: replayRes.status === 200 && blueprintGeneratedCount === 1,
    blueprintReceiptRefStable: traceAfterReplay?.blueprintReceiptRef === blueprintReceipt,
  };

  // Gather logs
  const sinceIso = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const fcLogs = await exec(`docker logs federation_core --since ${sinceIso} 2>&1`, { maxBuffer: 1024 * 1024 * 10 });
  await fs.writeFile(path.join(outDir, 'fc.log'), fcLogs.stdout || '');

  const finalLedger = traceForBlueprint ? await readLedgerEntries(traceForBlueprint) : [];
  evidence.ledger = finalLedger;
  evidence.trace = traceForBlueprint ? await readRuntimeTrace(traceForBlueprint) : null;

  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2));

  const workerLogText = await fs.readFile(workerLog, 'utf8').catch(() => '');
  const workerExcerpt = workerLogText.split(/\r?\n/).filter(Boolean).slice(-40).join('\n');
  const fcText = await fs.readFile(path.join(outDir, 'fc.log'), 'utf8').catch(() => '');
  const fcExcerpt = fcText.split(/\r?\n/).filter(Boolean).slice(-40).join('\n');

  const status = (v) => (v ? 'PASS' : 'FAIL');
  const overall = ['A','B','C','D','E','F','G','H'].every((k) => evidence.steps[k]?.pass);

  const md = `# FORGEPILOT_SMOKE_v1\n\n## Run Context\n- Base URL: \`${evidence.metadata.baseUrl}\`\n- Executed (Local): \`${evidence.metadata.localTime}\`\n- Executed (UTC): \`${evidence.metadata.utcTime}\`\n- ForgePilot Git SHA: \`${evidence.metadata.gitSha}\`\n- omega-sdk-ts Git SHA: \`${evidence.metadata.sdkSha}\`\n- SDK Tarball: \`${evidence.metadata.sdkTarball}\`\n- SDK Tarball SHA256: \`${evidence.metadata.sdkTarHash}\`\n- FC Image: \`${evidence.metadata.fcImage}\`\n- FC Image Digest: \`${evidence.metadata.fcDigest}\`\n\n## Step A - Workflow Registration\n- Command / request: \`node -r dotenv/config scripts/omega-register.mjs\`\n- HTTP status: \`${evidence.steps.A.status}\`\n- traceId: \`n/a\`\n- receiptRef: \`n/a\`\n- Expected vs actual: expected both workflows registered with artifact hashes; actual \`${Array.isArray(evidence.steps.A.result) ? evidence.steps.A.result.length : 0}\` registration entries\n- Pass/Fail: **${status(evidence.steps.A.pass)}**\n\n\`\`\`json\n${JSON.stringify(evidence.steps.A.result, null, 2)}\n\`\`\`\n\n## Step B - Teaser Run\n- Command / request: \`POST /api/launch/teaser\`\n- HTTP status: \`${evidence.steps.B.status}\`\n- traceId: \`${evidence.steps.B.traceId || ''}\`\n- receiptRef: \`${evidence.steps.B.receiptRef || ''}\`\n- Expected vs actual: expected teaser return traceId + receiptRef; actual status \`${evidence.steps.B.status}\`\n- Pass/Fail: **${status(evidence.steps.B.pass)}**\n\n\`\`\`json\n${JSON.stringify(evidence.responses.B?.json || evidence.responses.B?.text || {}, null, 2)}\n\`\`\`\n\n## Step C - Clarification Resume\n- Command / request: \`POST /api/launch/teaser\` (clarify) then \`POST /api/launch/teaser/answer\`\n- HTTP status: \`${evidence.steps.C.responseInitialStatus || 'n/a'} -> ${evidence.steps.C.responseResumeStatus || 'n/a'}\`\n- traceId: \`${evidence.steps.C.initialTraceId || ''}\`\n- receiptRef: \`${evidence.steps.C.receiptRef || ''}\`\n- Expected vs actual: expected same traceId before/after resume; actual resumed traceId \`${evidence.steps.C.responseResumeTraceId || ''}\`\n- Pass/Fail: **${status(evidence.steps.C.pass)}**\n\n\`\`\`json\n${JSON.stringify(evidence.responses.C || {}, null, 2)}\n\`\`\`\n\n## Step D - Export Before Blueprint Ready (Fail-Closed)\n- Command / request: \`POST /api/launch/export\` with teaser receipt after unlock\n- HTTP status: \`${evidence.steps.D.status}\`\n- traceId: \`${traceForBlueprint || ''}\`\n- receiptRef: \`${receiptForBlueprint || ''}\`\n- Expected vs actual: expected \`409\` with no artifact; actual \`${evidence.steps.D.status}\`\n- Pass/Fail: **${status(evidence.steps.D.pass)}**\n\n\`\`\`json\n${evidence.steps.D.responseText || ''}\n\`\`\`\n\n## Step E - Payment Unlock Webhook\n- Command / request: \`POST /api/webhooks/stripe\` (signed \`checkout.session.completed\` test event)\n- HTTP status: \`${evidence.steps.E.status}\`\n- traceId: \`${traceForBlueprint || ''}\`\n- receiptRef: \`${receiptForBlueprint || ''}\`\n- Expected vs actual: expected unlock + blueprint enqueue once; actual status \`${evidence.steps.E.status}\`\n- Pass/Fail: **${status(evidence.steps.E.pass)}**\n\n## Step F - Worker Durability (Kill + Restart)\n- Command / request: start worker, kill process, restart worker, wait for blueprint completion\n- HTTP status: \`n/a\`\n- traceId: \`${traceForBlueprint || ''}\`\n- receiptRef: \`${receiptForBlueprint || ''}\`\n- Key log excerpt (worker):\n\`\`\`text\n${workerExcerpt}\n\`\`\`\n- Stream pending evidence: after kill \`${JSON.stringify(evidence.steps.F.pendingAfterKill)}\`, after restart \`${JSON.stringify(evidence.steps.F.pendingAfterRestart)}\`\n- Expected vs actual: expected completion after restart; actual completed \`${String(evidence.steps.F.completed)}\`\n- Pass/Fail: **${status(evidence.steps.F.pass)}**\n\n## Step G - Blueprint Artifact + Receipt Separation\n- Command / request: export with blueprint receipt + mismatch test with teaser receipt\n- HTTP status: blueprint export \`${evidence.steps.G.exportBlueprintStatus}\`, mismatch export \`${evidence.steps.G.exportMismatchStatus}\`\n- traceId: \`${evidence.steps.G.traceId || ''}\`\n- receiptRef: teaser \`${evidence.steps.G.teaserReceiptRef || ''}\`, blueprint \`${evidence.steps.G.blueprintReceiptRef || ''}\`\n- Expected vs actual: expected distinct teaser/blueprint receipts and blueprint-only export on unlocked trace\n- Pass/Fail: **${status(evidence.steps.G.pass)}**\n\n## Step H - Replay Safety\n- Command / request: replay identical signed webhook payload\n- HTTP status: \`${evidence.steps.H.status}\`\n- traceId: \`${traceForBlueprint || ''}\`\n- receiptRef: \`${receiptForBlueprint || ''}\`\n- Ledger entry proof: \`blueprint.generated\` count = \`${evidence.steps.H.blueprintGeneratedCount}\`\n- Expected vs actual: expected no regeneration (count remains 1); actual count \`${evidence.steps.H.blueprintGeneratedCount}\`\n- Pass/Fail: **${status(evidence.steps.H.pass)}**\n\n## FC Log Excerpt\n\`\`\`text\n${fcExcerpt}\n\`\`\`\n\n## Ledger Entries (Trace)\n\`\`\`json\n${JSON.stringify(finalLedger, null, 2)}\n\`\`\`\n\n## Overall\n- Result: **${overall ? 'PASS (SEALED)' : 'FAIL (NOT SEALED)'}**\n- Step summary: A=${status(evidence.steps.A.pass)} B=${status(evidence.steps.B.pass)} C=${status(evidence.steps.C.pass)} D=${status(evidence.steps.D.pass)} E=${status(evidence.steps.E.pass)} F=${status(evidence.steps.F.pass)} G=${status(evidence.steps.G.pass)} H=${status(evidence.steps.H.pass)}\n`;

  await fs.writeFile(path.join(root, 'FORGEPILOT_SMOKE_v1.md'), md);
  console.log(JSON.stringify({ overall, steps: evidence.steps }, null, 2));
}

run().catch(async (err) => {
  await fs.writeFile(path.join(outDir, 'runner-error.log'), String(err?.stack || err));
  console.error(err);
  process.exit(1);
});
