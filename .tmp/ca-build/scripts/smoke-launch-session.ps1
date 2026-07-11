param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Email = "morganclint76@gmail.com",
  [string]$OutputDir = ".tmp/smoke-launch-v1"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$JsonBody,
    [hashtable]$Headers = @{}
  )

  $requestHeaders = @{ "Content-Type" = "application/json" }
  foreach ($key in $Headers.Keys) {
    $requestHeaders[$key] = $Headers[$key]
  }

  $statusCode = 0
  $content = ""
  try {
    $response = Invoke-WebRequest -Method POST -Uri $Url -Headers $requestHeaders -Body $JsonBody
    $statusCode = [int]$response.StatusCode
    $content = $response.Content
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      if ($_.Exception.Response.Content) {
        try {
          if ($_.Exception.Response.Content.ReadAsStringAsync) {
            $content = $_.Exception.Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
          } else {
            $content = "$($_.Exception.Response.Content)"
          }
        } catch {
          $content = "$($_.Exception.Response.Content)"
        }
      }
      try {
        if (-not $content -and $_.Exception.Response.GetResponseStream) {
          $stream = $_.Exception.Response.GetResponseStream()
          if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
          }
        }
      } catch {}
    }
    if (-not $content) {
      if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $content = $_.ErrorDetails.Message
      } else {
        $content = $_.Exception.Message
      }
    }
  }

  $json = $null
  try { $json = $content | ConvertFrom-Json } catch {}

  return [PSCustomObject]@{
    StatusCode = $statusCode
    Content = $content
    Json = $json
  }
}

function Save-Call {
  param(
    [string]$Name,
    [string]$RequestBody,
    [object]$Response
  )

  $RequestBody | Set-Content -Path (Join-Path $OutputDir "$Name.request.json")
  "HTTP $($Response.StatusCode)" | Set-Content -Path (Join-Path $OutputDir "$Name.status.txt")
  $Response.Content | Set-Content -Path (Join-Path $OutputDir "$Name.response.json")
}

$sessionA = [guid]::NewGuid().ToString()
$sessionB = [guid]::NewGuid().ToString()

$stepAReq = @{
  idea = "AI-powered compliance workflow for SMBs"
  email = $Email
  sessionId = $sessionA
} | ConvertTo-Json -Depth 4

$stepA = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser" -JsonBody $stepAReq
Save-Call -Name "stepA_teaser" -RequestBody $stepAReq -Response $stepA

$stepBReq = @{
  idea = "Something with AI for marketing"
  email = $Email
  sessionId = $sessionB
} | ConvertTo-Json -Depth 4

$stepB = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser" -JsonBody $stepBReq
Save-Call -Name "stepB_clarify" -RequestBody $stepBReq -Response $stepB

$traceB = if ($stepB.Json) { "$($stepB.Json.traceId)" } else { "" }

$stepCReq = @{
  traceId = $traceB
  answers = @{
    targetCustomer = "B2B SaaS founders"
    priceRange = '$49-$199/mo'
  }
} | ConvertTo-Json -Depth 6

$stepC = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser/answer" -JsonBody $stepCReq
Save-Call -Name "stepC_answer" -RequestBody $stepCReq -Response $stepC

$stepCReplay = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser/answer" -JsonBody $stepCReq
Save-Call -Name "stepC_answer_replay" -RequestBody $stepCReq -Response $stepCReplay

$attackReplayStatuses = @()
for ($i = 1; $i -le 5; $i++) {
  $replay = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser/answer" -JsonBody $stepCReq
  $attackReplayStatuses += $replay.StatusCode
  $replay.Content | Set-Content -Path (Join-Path $OutputDir "attack1_replay_$i.response.json")
}

$attack2Req = @{
  sessionId = $sessionB
  traceId = $traceB
  receiptRef = "fake_receipt_ref_123"
} | ConvertTo-Json -Depth 4
$attack2 = Invoke-JsonPost -Url "$BaseUrl/api/payments/create_launch_checkout" -JsonBody $attack2Req
Save-Call -Name "attack2_fake_receipt" -RequestBody $attack2Req -Response $attack2

$attack3Req = @{
  sessionId = $sessionB
  traceId = $traceB
} | ConvertTo-Json -Depth 4
$attack3 = Invoke-JsonPost -Url "$BaseUrl/api/payments/create_launch_checkout" -JsonBody $attack3Req
Save-Call -Name "attack3_no_receipt" -RequestBody $attack3Req -Response $attack3

$runtimePath = Join-Path (Get-Location) ".tmp/forgepilot-launch-runtime.json"
$db = $null
if (Test-Path $runtimePath) {
  $db = Get-Content $runtimePath -Raw | ConvertFrom-Json
  if ($db.traces.$traceB) {
    $db.traces.$traceB.status = "unlocked"
    $jsonOut = $db | ConvertTo-Json -Depth 12
    $jsonOut | Set-Content -Path $runtimePath
  }
}

$attack4 = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser/answer" -JsonBody $stepCReq
Save-Call -Name "attack4_resume_after_unlock" -RequestBody $stepCReq -Response $attack4

$ledgerPath = Join-Path (Get-Location) ".tmp/forgepilot-launch-ledger.jsonl"
$ledgerExcerpt = ""
if (Test-Path $ledgerPath) {
  $ledgerExcerpt = (Get-Content $ledgerPath | Select-Object -Last 25) -join "`n"
}

$artifactSnapshot = "{}"
if ($db -and $stepC.Json -and $db.traces.$($stepC.Json.traceId)) {
  $artifactSnapshot = ($db.traces.$($stepC.Json.traceId) | ConvertTo-Json -Depth 10)
}

$template = @'
# FORGEPILOT_SMOKE_v1

## Run Context
- Base URL: `{{BASE_URL}}`
- Email: `{{EMAIL}}`
- Executed At (UTC): `{{EXECUTED_AT}}`

## Step A - POST /api/launch/teaser
### Request
```json
{{STEP_A_REQ}}
```
### Response (`HTTP {{STEP_A_STATUS}}`)
```json
{{STEP_A_CONTENT}}
```

## Step B - Trigger Clarification Branch
### Request
```json
{{STEP_B_REQ}}
```
### Response (`HTTP {{STEP_B_STATUS}}`)
```json
{{STEP_B_CONTENT}}
```

## Step C - POST /api/launch/teaser/answer
### Request
```json
{{STEP_C_REQ}}
```
### Response (`HTTP {{STEP_C_STATUS}}`)
```json
{{STEP_C_CONTENT}}
```

## Idempotency Replay Check
- First replay HTTP: `{{STEP_C_REPLAY_STATUS}}`
- Attack1 replay statuses (x5): `{{ATTACK1_STATUSES}}`

## Attack Pass Results
- Attack2 fake receipt HTTP: `{{ATTACK2_STATUS}}`
- Attack3 payment without receipt HTTP: `{{ATTACK3_STATUS}}`
- Attack4 resume after unlock HTTP: `{{ATTACK4_STATUS}}`

## FC Ledger Excerpt
```json
{{LEDGER_EXCERPT}}
```

## Artifact Hash Snapshot
```json
{{ARTIFACT_SNAPSHOT}}
```
'@

$md = $template.
  Replace('{{BASE_URL}}', $BaseUrl).
  Replace('{{EMAIL}}', $Email).
  Replace('{{EXECUTED_AT}}', ((Get-Date).ToUniversalTime().ToString('o'))).
  Replace('{{STEP_A_REQ}}', $stepAReq).
  Replace('{{STEP_A_STATUS}}', "$($stepA.StatusCode)").
  Replace('{{STEP_A_CONTENT}}', "$($stepA.Content)").
  Replace('{{STEP_B_REQ}}', $stepBReq).
  Replace('{{STEP_B_STATUS}}', "$($stepB.StatusCode)").
  Replace('{{STEP_B_CONTENT}}', "$($stepB.Content)").
  Replace('{{STEP_C_REQ}}', $stepCReq).
  Replace('{{STEP_C_STATUS}}', "$($stepC.StatusCode)").
  Replace('{{STEP_C_CONTENT}}', "$($stepC.Content)").
  Replace('{{STEP_C_REPLAY_STATUS}}', "$($stepCReplay.StatusCode)").
  Replace('{{ATTACK1_STATUSES}}', ($attackReplayStatuses -join ', ')).
  Replace('{{ATTACK2_STATUS}}', "$($attack2.StatusCode)").
  Replace('{{ATTACK3_STATUS}}', "$($attack3.StatusCode)").
  Replace('{{ATTACK4_STATUS}}', "$($attack4.StatusCode)").
  Replace('{{LEDGER_EXCERPT}}', $ledgerExcerpt).
  Replace('{{ARTIFACT_SNAPSHOT}}', $artifactSnapshot)

$reportPath = Join-Path (Get-Location) "FORGEPILOT_SMOKE_v1.md"
$md | Set-Content -Path $reportPath

Write-Host "Smoke complete. Report: $reportPath"
