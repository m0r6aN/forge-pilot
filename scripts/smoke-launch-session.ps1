param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Email = "",
  [string]$VerifyUrl = "",
  [string]$SessionId = "",
  [string]$Idea = "A scheduling and client reminder tool for independent barbers to reduce no-shows and last-minute cancellations.",
  [string]$Answer1 = "Independent barbers renting chairs who lose money from no-shows.",
  [string]$Answer2 = "Individuals first.",
  [string]$OutputDir = ".tmp/smoke-launch",
  [switch]$SkipUnlock,
  [switch]$SkipCheckout
)

$ErrorActionPreference = "Stop"

if (-not $SessionId) {
  $SessionId = [guid]::NewGuid().ToString()
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "Base URL   : $BaseUrl"
Write-Host "Session ID : $SessionId"
Write-Host "Output Dir : $OutputDir"

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$JsonBody,
    [hashtable]$Headers = @{},
    [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession
  )

  $requestHeaders = @{ "Content-Type" = "application/json" }
  foreach ($key in $Headers.Keys) {
    $requestHeaders[$key] = $Headers[$key]
  }

  try {
    if ($WebSession) {
      $response = Invoke-WebRequest -Method POST -Uri $Url -Headers $requestHeaders -Body $JsonBody -WebSession $WebSession
    } else {
      $response = Invoke-WebRequest -Method POST -Uri $Url -Headers $requestHeaders -Body $JsonBody
    }
    $statusCode = [int]$response.StatusCode
    $content = $response.Content
  } catch {
    $httpResponse = $_.Exception.Response
    if ($httpResponse -and $httpResponse.StatusCode) {
      $statusCode = [int]$httpResponse.StatusCode.value__
      try {
        $stream = $httpResponse.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = $reader.ReadToEnd()
        } else {
          $content = $_.Exception.Message
        }
      } catch {
        $content = $_.Exception.Message
      }
    } else {
      $statusCode = 0
      $content = "{`"error`":`"request_failed`",`"message`":`"$($_.Exception.Message -replace '"','\"')`"}"
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

# 1) teaser
$teaserBody = @{
  idea = $Idea
  advanced = @{
    colorMode = "vibe"
    hexColors = @()
    colorVibe = "calm and trustworthy, not flashy"
    tone = "confident but not cocky"
    budget = "small"
  }
  sessionId = $SessionId
} | ConvertTo-Json -Depth 6

$teaser = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser" -JsonBody $teaserBody
$teaser.Content | Set-Content -Path (Join-Path $OutputDir "teaser_body.json")
"HTTP $($teaser.StatusCode)" | Set-Content -Path (Join-Path $OutputDir "teaser_status.txt")

Write-Host "`n[teaser] HTTP $($teaser.StatusCode)"
Write-Host $teaser.Content

$latest = $teaser

# 2) answer if needed
if ($teaser.Json -and $teaser.Json.needs_clarification -eq $true) {
  $answersBody = @{
    sessionId = $SessionId
    answers = @($Answer1, $Answer2)
  } | ConvertTo-Json -Depth 4

  $answer = Invoke-JsonPost -Url "$BaseUrl/api/launch/teaser/answer" -JsonBody $answersBody
  $answer.Content | Set-Content -Path (Join-Path $OutputDir "answer_body.json")
  "HTTP $($answer.StatusCode)" | Set-Content -Path (Join-Path $OutputDir "answer_status.txt")

  Write-Host "`n[answer] HTTP $($answer.StatusCode)"
  Write-Host $answer.Content

  $latest = $answer
}

if ($SkipUnlock) {
  Write-Host "`nSkipping unlock/checkout by request."
  exit 0
}

if (-not $Email) {
  throw "Email is required for unlock flow unless -SkipUnlock is set."
}

$ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 3) unlock request link
$unlockBody = @{
  email = $Email
  sessionId = $SessionId
} | ConvertTo-Json -Depth 4

$unlock = Invoke-JsonPost `
  -Url "$BaseUrl/api/launch/unlock/request-link" `
  -JsonBody $unlockBody `
  -Headers @{ "Idempotency-Key" = "smoke-unlock-$SessionId" }

$unlock.Content | Set-Content -Path (Join-Path $OutputDir "unlock_body.json")
"HTTP $($unlock.StatusCode)" | Set-Content -Path (Join-Path $OutputDir "unlock_status.txt")

Write-Host "`n[unlock] HTTP $($unlock.StatusCode)"
Write-Host $unlock.Content

if (-not $VerifyUrl) {
  Write-Host "`nOpen the verification email and paste the full verify URL."
  $VerifyUrl = Read-Host "Verify URL"
}

# 4) click verify link (and one-time replay check)
$verify1 = Invoke-WebRequest -Uri $VerifyUrl -WebSession $ws -MaximumRedirection 0 -ErrorAction SilentlyContinue
$verify1Status = if ($verify1) { [int]$verify1.StatusCode } else { 0 }
"HTTP $verify1Status" | Set-Content -Path (Join-Path $OutputDir "verify_first_status.txt")
Write-Host "`n[verify-first] HTTP $verify1Status"

$verify2 = Invoke-WebRequest -Uri $VerifyUrl -WebSession $ws -MaximumRedirection 0 -ErrorAction SilentlyContinue
$verify2Status = if ($verify2) { [int]$verify2.StatusCode } else { 0 }
"HTTP $verify2Status" | Set-Content -Path (Join-Path $OutputDir "verify_second_status.txt")
Write-Host "[verify-second] HTTP $verify2Status (expected fail-closed redirect)"

if ($SkipCheckout) {
  Write-Host "`nSkipping checkout by request."
  exit 0
}

# 5) create checkout session using cookie session
$checkoutBody = @{ sessionId = $SessionId } | ConvertTo-Json -Depth 3
$checkout = Invoke-JsonPost `
  -Url "$BaseUrl/api/payments/create_launch_checkout" `
  -JsonBody $checkoutBody `
  -Headers @{ "Idempotency-Key" = "smoke-checkout-$SessionId" } `
  -WebSession $ws

$checkout.Content | Set-Content -Path (Join-Path $OutputDir "checkout_body.json")
"HTTP $($checkout.StatusCode)" | Set-Content -Path (Join-Path $OutputDir "checkout_status.txt")

Write-Host "`n[checkout] HTTP $($checkout.StatusCode)"
Write-Host $checkout.Content

Write-Host "`nSmoke flow complete. Artifacts saved in $OutputDir"
