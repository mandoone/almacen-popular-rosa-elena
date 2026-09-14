[CmdletBinding()]
param(
  [switch]$Execute,
  [string]$Confirmacion = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ClaspPackage = '@google/clasp@3.4.1'
$ConfirmacionRequerida = 'DESPLEGAR_SOLO_TEST'
$NombreSheetTest = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES'
$RutaConfigSegura = Join-Path $env:USERPROFILE '.almacen-popular-clasp-test.json'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$FuenteAppsScript = Join-Path $PSScriptRoot 'apps-script-pedidos.gs'
$TempRoot = $null

function Stop-Safe([string]$Message) {
  throw $Message
}

function Invoke-ClaspRaw {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Step
  )

  Push-Location $WorkingDirectory
  try {
    $output = & npx.cmd --yes $ClaspPackage @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($exitCode -ne 0) {
    Stop-Safe "clasp fallo durante '$Step'. La salida fue suprimida por seguridad."
  }
  return @($output)
}

function Invoke-ClaspJson {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Step
  )

  $output = Invoke-ClaspRaw -Arguments $Arguments -WorkingDirectory $WorkingDirectory -Step $Step
  try {
    return (($output -join "`n") | ConvertFrom-Json)
  } catch {
    Stop-Safe "clasp devolvio JSON invalido durante '$Step'. La salida fue suprimida."
  }
}

function Get-OnlyMatch {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $matches = [regex]::Matches($Text, $Pattern)
  if ($matches.Count -ne 1) {
    Stop-Safe "No se pudo preservar de forma inequivoca $Label."
  }
  return $matches[0]
}

function Assert-CloneInventory([string]$Directory, [string]$Label) {
  $directories = @(Get-ChildItem -LiteralPath $Directory -Directory -Force)
  $files = @(Get-ChildItem -LiteralPath $Directory -File -Force)
  $code = @($files | Where-Object { $_.Extension -in @('.js', '.gs') })
  $manifest = @($files | Where-Object { $_.Name -eq 'appsscript.json' })
  $project = @($files | Where-Object { $_.Name -eq '.clasp.json' })
  $allowed = @($code + $manifest + $project)

  if (
    $directories.Count -ne 0 -or
    $files.Count -ne 3 -or
    $code.Count -ne 1 -or
    $manifest.Count -ne 1 -or
    $project.Count -ne 1 -or
    $allowed.Count -ne $files.Count
  ) {
    Stop-Safe "Inventario remoto inesperado en $Label; despliegue bloqueado."
  }

  return [pscustomobject]@{
    Code = $code[0]
    Manifest = $manifest[0]
  }
}

function Get-Deployments([string]$ScriptId) {
  $result = Invoke-ClaspJson `
    -Arguments @('--json', 'deployments', $ScriptId) `
    -WorkingDirectory $RepoRoot `
    -Step 'listar deployments'
  return @($result)
}

function Get-TargetDeployment([object[]]$Deployments, [string]$DeploymentId) {
  $matches = @($Deployments | Where-Object {
    $deploymentProperty = $_.PSObject.Properties['deploymentId']
    $idProperty = $_.PSObject.Properties['id']
    ($null -ne $deploymentProperty -and [string]$deploymentProperty.Value -eq $DeploymentId) -or
      ($null -ne $idProperty -and [string]$idProperty.Value -eq $DeploymentId)
  })
  if ($matches.Count -ne 1) {
    Stop-Safe 'El deployment TEST configurado no pertenece inequivocamente al proyecto indicado.'
  }
  if ($null -eq $matches[0].versionNumber -or [int]$matches[0].versionNumber -lt 1) {
    Stop-Safe 'El deployment TEST no tiene una version inmutable valida.'
  }
  return $matches[0]
}

function Invoke-TestPreflight {
  $requestUri = $testUrl +
    '?action=verificarDestinoE2EFase56' +
    '&token=' + [Uri]::EscapeDataString($testToken) +
    '&_clasp_request_id=' + [Guid]::NewGuid().ToString('N')
  $response = $null
  for ($attempt = 1; $attempt -le 2; $attempt++) {
    try {
      $ProgressPreference = 'SilentlyContinue'
      $response = Invoke-WebRequest `
        -Method Get `
        -Uri $requestUri `
        -Headers @{ 'Cache-Control' = 'no-store' } `
        -MaximumRedirection 5 `
        -UseBasicParsing
      break
    } catch {
      if ($attempt -eq 2) {
        Stop-Safe 'El preflight read-only TEST no pudo contactar el backend verificado.'
      }
      Start-Sleep -Milliseconds 1000
    }
  }
  if ($null -eq $response -or [int]$response.StatusCode -ne 200) {
    Stop-Safe 'El preflight read-only TEST no devolvio HTTP 200.'
  }
  try { $json = $response.Content | ConvertFrom-Json }
  catch { Stop-Safe 'El preflight read-only TEST no devolvio JSON valido.' }
  $okProperty = $json.PSObject.Properties['ok']
  $dataProperty = $json.PSObject.Properties['data']
  if ($null -eq $okProperty -or $okProperty.Value -ne $true -or $null -eq $dataProperty) {
    Stop-Safe 'El preflight read-only TEST devolvio un error funcional.'
  }
  $data = $dataProperty.Value
  $entorno = $data.PSObject.Properties['entorno']
  $destino = $data.PSObject.Properties['destino']
  $contrato = $data.PSObject.Properties['contrato']
  $sheet = $data.PSObject.Properties['sheet_nombre']
  if (
    $null -eq $entorno -or $entorno.Value -cne 'TEST' -or
    $null -eq $destino -or $destino.Value -cne 'backend_test_verificado' -or
    $null -eq $contrato -or $contrato.Value -cne 'fase56_e2e_test_v1' -or
    $null -eq $sheet -or $sheet.Value -cne $NombreSheetTest
  ) {
    Stop-Safe 'El backend remoto no demostro inequívocamente el destino TEST.'
  }
  Write-Output 'PASS | preflight remoto TEST read-only'
}

function Get-CreatedVersion([object[]]$Output) {
  $text = $Output -join "`n"
  try {
    $json = $text | ConvertFrom-Json
    foreach ($name in @('versionNumber', 'version')) {
      $property = $json.PSObject.Properties[$name]
      if ($null -ne $property -and [int]$property.Value -gt 0) {
        return [int]$property.Value
      }
    }
  } catch {
    # clasp 3.x puede devolver texto aun con --json en algunos comandos.
  }
  $match = [regex]::Match($text, '(?i)\bversion\D+(\d+)\b')
  if (-not $match.Success) {
    Stop-Safe 'No se pudo confirmar el numero de la nueva version; redeploy bloqueado.'
  }
  return [int]$match.Groups[1].Value
}

try {
  if ($env:NEXT_PUBLIC_APP_ENV -cne 'test') {
    Stop-Safe 'NEXT_PUBLIC_APP_ENV debe ser exactamente test.'
  }
  foreach ($name in @('GOOGLE_SCRIPT_PEDIDOS_URL', 'GOOGLE_SCRIPT_ADMIN_TOKEN')) {
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
      Stop-Safe "La variable productiva $name esta presente; operacion bloqueada."
    }
  }

  $testUrl = [Environment]::GetEnvironmentVariable('GOOGLE_SCRIPT_PEDIDOS_URL_TEST')
  $testToken = [Environment]::GetEnvironmentVariable('GOOGLE_SCRIPT_ADMIN_TOKEN_TEST')
  if ([string]::IsNullOrWhiteSpace($testUrl) -or [string]::IsNullOrWhiteSpace($testToken)) {
    Stop-Safe 'Falta configuracion TEST obligatoria en el proceso actual.'
  }
  if ($testUrl -ne $testUrl.Trim() -or $testToken -ne $testToken.Trim()) {
    Stop-Safe 'La configuracion TEST contiene espacios externos.'
  }

  try { $testUri = [Uri]$testUrl } catch { Stop-Safe 'La URL TEST no tiene formato valido.' }
  if (
    $testUri.Scheme -cne 'https' -or
    $testUri.Host -cne 'script.google.com' -or
    $testUri.Query -or
    $testUri.Fragment
  ) {
    Stop-Safe 'La URL TEST no tiene el formato canonico esperado.'
  }
  $deploymentMatch = [regex]::Match($testUri.AbsolutePath, '^/macros/s/([^/]+)/exec$')
  if (-not $deploymentMatch.Success) {
    Stop-Safe 'No se pudo derivar el deployment TEST existente.'
  }
  $deploymentId = $deploymentMatch.Groups[1].Value

  if (-not (Test-Path -LiteralPath $RutaConfigSegura -PathType Leaf)) {
    Stop-Safe 'Falta la configuracion clasp TEST segura fuera del repositorio.'
  }
  try { $secureConfig = Get-Content -LiteralPath $RutaConfigSegura -Raw | ConvertFrom-Json }
  catch { Stop-Safe 'La configuracion clasp TEST segura no es JSON valido.' }
  $configKeys = @($secureConfig.PSObject.Properties.Name)
  if (
    $configKeys.Count -ne 1 -or
    $configKeys[0] -cne 'scriptId' -or
    $secureConfig.scriptId -isnot [string] -or
    $secureConfig.scriptId -notmatch '^[A-Za-z0-9_-]{20,100}$'
  ) {
    Stop-Safe 'La configuracion clasp TEST debe contener solo un scriptId valido.'
  }
  $scriptId = [string]$secureConfig.scriptId

  if (-not (Test-Path -LiteralPath $FuenteAppsScript -PathType Leaf)) {
    Stop-Safe 'No existe la fuente Apps Script versionada esperada.'
  }

  $auth = Invoke-ClaspJson `
    -Arguments @('--json', 'show-authorized-user') `
    -WorkingDirectory $RepoRoot `
    -Step 'verificar autorizacion'
  if ($auth.loggedIn -ne $true) {
    Stop-Safe 'clasp no tiene una sesion Google autorizada.'
  }

  $deployments = Get-Deployments -ScriptId $scriptId
  $target = Get-TargetDeployment -Deployments $deployments -DeploymentId $deploymentId
  $baselineVersion = [int]$target.versionNumber

  Invoke-TestPreflight

  $TempRoot = Join-Path ([IO.Path]::GetTempPath()) ('almacen-clasp-test-' + [Guid]::NewGuid().ToString('N'))
  $headDirectory = Join-Path $TempRoot 'remote-head'
  $versionDirectory = Join-Path $TempRoot 'remote-version'
  $payloadDirectory = Join-Path $TempRoot 'payload'
  New-Item -ItemType Directory -Path $headDirectory, $versionDirectory, $payloadDirectory | Out-Null

  Invoke-ClaspRaw `
    -Arguments @('clone', $scriptId) `
    -WorkingDirectory $headDirectory `
    -Step 'pull remoto HEAD' | Out-Null
  Invoke-ClaspRaw `
    -Arguments @('clone', $scriptId, [string]$baselineVersion) `
    -WorkingDirectory $versionDirectory `
    -Step 'pull remoto desplegado' | Out-Null

  $headInventory = Assert-CloneInventory -Directory $headDirectory -Label 'HEAD'
  $versionInventory = Assert-CloneInventory -Directory $versionDirectory -Label 'version desplegada'
  $headCode = Get-Content -LiteralPath $headInventory.Code.FullName -Raw
  $versionCode = Get-Content -LiteralPath $versionInventory.Code.FullName -Raw
  $headManifest = Get-Content -LiteralPath $headInventory.Manifest.FullName -Raw
  $versionManifest = Get-Content -LiteralPath $versionInventory.Manifest.FullName -Raw
  if ($headCode -cne $versionCode -or $headManifest -cne $versionManifest) {
    Stop-Safe 'HEAD remoto y deployment TEST difieren; despliegue bloqueado.'
  }

  foreach ($feature in @(
    'validarEntornoTestVentas_',
    'verificarDestinoE2EFase56',
    'obtenerEstadoE2EFase56',
    'obtenerEvidenciaVentaE2EFase56',
    $NombreSheetTest
  )) {
    if (-not $versionCode.Contains($feature)) {
      Stop-Safe 'El deployment resuelto no demuestra el contrato TEST E2E esperado.'
    }
  }

  $spreadsheetMatch = Get-OnlyMatch `
    -Text $versionCode `
    -Pattern "(?m)^var SPREADSHEET_ID = '([^'\r\n]+)';\s*$" `
    -Label 'SPREADSHEET_ID TEST'
  $tokenMatch = Get-OnlyMatch `
    -Text $versionCode `
    -Pattern "(?m)^var ADMIN_TOKEN = '([^'\r\n]+)';\s*$" `
    -Label 'ADMIN_TOKEN TEST'
  if (
    $spreadsheetMatch.Groups[1].Value -eq 'PEGAR_ID_BASE_OPERATIVA_AQUI' -or
    $tokenMatch.Groups[1].Value -eq 'PEGAR_TOKEN_ADMIN_AQUI' -or
    $tokenMatch.Groups[1].Value -cne $testToken
  ) {
    Stop-Safe 'La configuracion embebida remota no coincide inequivocamente con TEST.'
  }

  $localCode = Get-Content -LiteralPath $FuenteAppsScript -Raw
  $localSpreadsheet = Get-OnlyMatch `
    -Text $localCode `
    -Pattern "(?m)^var SPREADSHEET_ID = 'PEGAR_ID_BASE_OPERATIVA_AQUI';\s*$" `
    -Label 'placeholder local SPREADSHEET_ID'
  $localToken = Get-OnlyMatch `
    -Text $localCode `
    -Pattern "(?m)^var ADMIN_TOKEN = 'PEGAR_TOKEN_ADMIN_AQUI';\s*$" `
    -Label 'placeholder local ADMIN_TOKEN'
  $payloadCode = $localCode.Replace($localSpreadsheet.Value, $spreadsheetMatch.Value)
  $payloadCode = $payloadCode.Replace($localToken.Value, $tokenMatch.Value)
  if ($payloadCode.Contains('PEGAR_ID_BASE_OPERATIVA_AQUI') -or $payloadCode.Contains('PEGAR_TOKEN_ADMIN_AQUI')) {
    Stop-Safe 'El payload conserva placeholders; despliegue bloqueado.'
  }

  $remoteCodeName = $headInventory.Code.Name
  if ($remoteCodeName -ne [IO.Path]::GetFileName($remoteCodeName)) {
    Stop-Safe 'Nombre remoto de archivo Apps Script invalido.'
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText((Join-Path $payloadDirectory $remoteCodeName), $payloadCode, $utf8NoBom)
  [IO.File]::WriteAllText((Join-Path $payloadDirectory 'appsscript.json'), $headManifest, $utf8NoBom)
  $projectJson = [ordered]@{ scriptId = $scriptId; rootDir = '.' } | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $payloadDirectory '.clasp.json'), $projectJson, $utf8NoBom)

  $payloadFiles = @(Get-ChildItem -LiteralPath $payloadDirectory -File -Force)
  $expectedPayloadNames = @('.clasp.json', 'appsscript.json', $remoteCodeName) | Sort-Object
  $actualPayloadNames = @($payloadFiles.Name | Sort-Object)
  if (($actualPayloadNames -join "`n") -cne ($expectedPayloadNames -join "`n")) {
    Stop-Safe 'El payload contiene archivos inesperados.'
  }

  $status = Invoke-ClaspJson `
    -Arguments @('--json', 'status') `
    -WorkingDirectory $payloadDirectory `
    -Step 'dry-run de payload'
  $filesToPush = @($status.filesToPush | Sort-Object)
  $expectedToPush = @('appsscript.json', $remoteCodeName) | Sort-Object
  if (($filesToPush -join "`n") -cne ($expectedToPush -join "`n")) {
    Stop-Safe 'clasp intentaria subir un payload inesperado.'
  }
  $untrackedFiles = @($status.untrackedFiles | Sort-Object)
  if (($untrackedFiles -join "`n") -cne '.clasp.json') {
    Stop-Safe 'clasp detecto archivos locales inesperados fuera del payload.'
  }

  Write-Output 'ENTORNO: TEST'
  Write-Output 'PROYECTO: Apps Script TEST verificado'
  Write-Output 'DEPLOYMENT: Web App TEST existente verificado'
  Write-Output 'PAYLOAD: un archivo Apps Script y manifest; configuracion remota preservada'

  if (-not $Execute) {
    Write-Output 'PASS | dry-run clasp TEST; no hubo push ni deploy'
    return
  }
  if ($Confirmacion -cne $ConfirmacionRequerida) {
    Stop-Safe "Para desplegar se requiere -Confirmacion $ConfirmacionRequerida."
  }

  $currentTarget = Get-TargetDeployment `
    -Deployments (Get-Deployments -ScriptId $scriptId) `
    -DeploymentId $deploymentId
  if ([int]$currentTarget.versionNumber -ne $baselineVersion) {
    Stop-Safe 'El deployment objetivo cambio durante la ejecucion; operacion bloqueada.'
  }

  Invoke-ClaspRaw `
    -Arguments @('push', '--force') `
    -WorkingDirectory $payloadDirectory `
    -Step 'push exclusivo a Apps Script TEST' | Out-Null
  $versionOutput = Invoke-ClaspRaw `
    -Arguments @('--json', 'version', 'Actualizacion automatizada TEST') `
    -WorkingDirectory $payloadDirectory `
    -Step 'crear version TEST'
  $newVersion = Get-CreatedVersion -Output $versionOutput

  $targetBeforeRedeploy = Get-TargetDeployment `
    -Deployments (Get-Deployments -ScriptId $scriptId) `
    -DeploymentId $deploymentId
  if ([int]$targetBeforeRedeploy.versionNumber -ne $baselineVersion) {
    Stop-Safe 'El deployment objetivo cambio antes del redeploy; operacion bloqueada.'
  }

  $redeploy = Invoke-ClaspJson `
    -Arguments @(
      'redeploy', $deploymentId,
      '--versionNumber', [string]$newVersion,
      '--description', 'Actualizacion automatizada TEST',
      '--json'
    ) `
    -WorkingDirectory $payloadDirectory `
    -Step 'actualizar deployment TEST existente'
  $deploymentProperty = $redeploy.PSObject.Properties['deploymentId']
  $idProperty = $redeploy.PSObject.Properties['id']
  $returnedDeploymentId = if ($null -ne $deploymentProperty) {
    [string]$deploymentProperty.Value
  } elseif ($null -ne $idProperty) {
    [string]$idProperty.Value
  } else { '' }
  if ($returnedDeploymentId -and $returnedDeploymentId -cne $deploymentId) {
    Stop-Safe 'clasp devolvio un deployment distinto; verificacion final bloqueada.'
  }

  Invoke-TestPreflight
  Write-Output 'PASS | Apps Script TEST actualizado en el deployment existente'
} catch {
  Write-Error ('FAIL | ' + $_.Exception.Message)
  exit 1
} finally {
  if ($null -ne $TempRoot -and (Test-Path -LiteralPath $TempRoot)) {
    $resolved = [IO.Path]::GetFullPath($TempRoot)
    $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (
      $resolved.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $resolved) -like 'almacen-clasp-test-*'
    ) {
      Remove-Item -LiteralPath $resolved -Recurse -Force
    } else {
      Write-Error 'No se limpio la carpeta temporal porque su ruta no supero el guardarrail.'
    }
  }
}
