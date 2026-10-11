param([switch]$Debug)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$toolRoot=Join-Path $projectRoot '.tools'
if(-not (Test-Path -LiteralPath $toolRoot)){New-Item -ItemType Junction -Path $toolRoot -Target (Join-Path $projectRoot '.tools') | Out-Null}
$buildRootTask=Join-Path ([IO.Path]::GetTempPath()) 'xu-calendar-build'
if(-not $env:GRADLE_USER_HOME){$env:GRADLE_USER_HOME=Join-Path ([IO.Path]::GetTempPath()) 'xu-calendar-gradle'}
New-Item -ItemType Directory -Path $buildRootTask -Force | Out-Null
& (Join-Path $projectRoot 'scripts/stage-build.ps1') -ProjectRoot $projectRoot -BuildRoot $buildRootTask
$jdkPath=(Get-ChildItem (Join-Path $toolRoot 'jdk') -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME=$jdkPath
if(-not $env:ANDROID_HOME){$env:ANDROID_HOME=Join-Path $toolRoot 'android-sdk'}
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$gradlePath=Join-Path $toolRoot 'gradle/gradle-8.9/bin/gradle.bat'
if(-not $Debug){
 $env:XU_SCHEDULE_KEYSTORE=Join-Path $projectRoot '.release-signing/calendar-release.jks'
 $env:XU_SCHEDULE_KEY_ALIAS='calendar'
 $securePasswordTask=Import-Clixml -LiteralPath (Join-Path $projectRoot '.release-signing/password.xml')
 $passwordPointerTask=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePasswordTask)
 try {$env:XU_SCHEDULE_KEYSTORE_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointerTask);$env:XU_SCHEDULE_KEY_PASSWORD=$env:XU_SCHEDULE_KEYSTORE_PASSWORD}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointerTask)}
}
try {
 $task=if($Debug){'assembleDebug'}else{'assembleRelease'}
 & $gradlePath -p (Join-Path $buildRootTask 'android-webview') --no-daemon $task testDebugUnitTest lintDebug
 if($LASTEXITCODE -ne 0){throw 'Android validation/build failed'}
 if(-not $Debug){
  $output=Join-Path $projectRoot 'release';New-Item -ItemType Directory -Path $output -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $buildRootTask 'android-webview/app/build/outputs/apk/release/app-release.apk') -Destination (Join-Path $output 'xu-schedule.apk')
  & (Join-Path $env:ANDROID_HOME 'build-tools/35.0.0/apksigner.bat') verify --verbose (Join-Path $output 'xu-schedule.apk')
  if($LASTEXITCODE -ne 0){throw 'APK signature verification failed'}
  Write-Output ('Release APK: '+(Join-Path $output 'xu-schedule.apk'))
 }
}finally{
 Remove-Item Env:XU_SCHEDULE_KEYSTORE_PASSWORD,Env:XU_SCHEDULE_KEY_PASSWORD,Env:XU_SCHEDULE_KEYSTORE,Env:XU_SCHEDULE_KEY_ALIAS -ErrorAction SilentlyContinue
}


