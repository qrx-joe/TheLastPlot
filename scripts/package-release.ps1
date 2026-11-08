param([string]$ReleaseName = 'TheLastPlot-20261108-rc1')
$ErrorActionPreference = 'Stop'
if ($ReleaseName -notmatch '^[A-Za-z0-9._-]+$') { throw 'ReleaseName 只能包含字母、数字、点、下划线及连字符。' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "output/releases/$ReleaseName"
if (Test-Path -LiteralPath $releaseRoot) { throw "输出已存在，请使用新的 ReleaseName：$releaseRoot" }
Push-Location $projectRoot
try {
  $dirty = & git status --porcelain
  if ($LASTEXITCODE -ne 0 -or $dirty) { throw '请先审查并提交当前变更，再生成对应提交的源码包。' }
  $revision = (& git rev-parse HEAD).Trim()
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw '生产构建失败。' }
  New-Item -ItemType Directory -Path $releaseRoot | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination (Join-Path $releaseRoot 'web') -Recurse
  & node scripts/verify-release.mjs --directory (Join-Path $releaseRoot 'web') --base / --report (Join-Path $releaseRoot 'web-manifest.json')
  if ($LASTEXITCODE -ne 0) { throw '静态文件检查失败。' }
  $webFiles = @(Get-ChildItem -LiteralPath (Join-Path $releaseRoot 'web') | ForEach-Object FullName)
  Compress-Archive -LiteralPath $webFiles -DestinationPath (Join-Path $releaseRoot 'TheLastPlot-web.zip')
  & git archive --format=zip --output=(Join-Path $releaseRoot 'TheLastPlot-source.zip') HEAD
  if ($LASTEXITCODE -ne 0) { throw '源码归档失败。' }
  Copy-Item -LiteralPath (Join-Path $projectRoot 'docs') -Destination (Join-Path $releaseRoot 'docs') -Recurse
  Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $releaseRoot
  Copy-Item -LiteralPath (Join-Path $projectRoot 'output/pdf/TheLastPlot-project-report.pdf') -Destination $releaseRoot
  Copy-Item -LiteralPath (Join-Path $projectRoot 'output/presentations/TheLastPlot-project-report.pptx') -Destination $releaseRoot
  Copy-Item -LiteralPath (Join-Path $projectRoot 'output/s5-acceptance/share-screenshots') -Destination (Join-Path $releaseRoot 'screenshots') -Recurse
  $files = @(Get-ChildItem -LiteralPath $releaseRoot -Recurse -File | ForEach-Object {
    [ordered]@{ path = [System.IO.Path]::GetRelativePath($releaseRoot, $_.FullName).Replace('\', '/'); bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  })
  [ordered]@{ sourceCommit = $revision; createdAt = (Get-Date).ToUniversalTime().ToString('o'); deployedUrl = $null; video = 'pending-user-recording'; files = $files } |
    ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $releaseRoot 'release-manifest.json') -Encoding utf8
  Write-Output "发布候选已生成，尚未部署：$releaseRoot"
} finally { Pop-Location }
