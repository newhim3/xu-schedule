param([string]$ProjectRoot,[string]$BuildRoot)
New-Item -ItemType Directory -Path (Join-Path $BuildRoot 'android-webview/app'),(Join-Path $BuildRoot 'replica') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'android-webview') -File | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $BuildRoot 'android-webview') -Force}
Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'android-webview/app') -File | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $BuildRoot 'android-webview/app') -Force}
Copy-Item -LiteralPath (Join-Path $ProjectRoot 'android-webview/app/src') -Destination (Join-Path $BuildRoot 'android-webview/app') -Recurse -Force
Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'replica') -File | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $BuildRoot 'replica') -Force}
