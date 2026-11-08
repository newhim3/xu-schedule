# 序 · 日程平板 Android 兼容版

平板上已有能安装本地 APK 的安卓兼容环境时，在该环境里打开平板安装包。平板版和手机版是两个独立应用。平板日历在宽屏下左边显示日历，右边显示当天详情。窄分屏会切回单栏。

## 迁移手机记录

在手机应用中进入「设置 → 完整备份与恢复」，导出完整备份。在平板进入同一页面，选择「导入并合并备份」。日历安排、任务、目标、专注记录、感悟和设置都可随备份迁移。备份导入可以离线完成。

## 部署同步服务

两个 APK 使用同一套同步协议。部署服务后，手机和平板打开「设置 → 完整备份与恢复 → 同步账号」，填写同一个服务地址、用户名和密码。先在已有记录的手机登录，再在平板登录。两端可以手动同步，也会在应用打开时定期同步。

1. 在运行 Node.js 22 或更高版本的主机上部署本仓库的代码。用下面的 PowerShell 命令生成账号配置和服务密钥。用户名可换成 3–32 个小写字母、数字或 `._-`，并以字母或数字开头。密码为 8–128 个字符。

   ```powershell
   $syncPassword = Read-Host '同步密码' -AsSecureString
   $syncPasswordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($syncPassword)
   try {
       $env:XU_SYNC_ACCOUNTS = @{username='owner';password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($syncPasswordPtr)} | ConvertTo-Json -Compress | node scripts/sync-auth.cjs
   } finally {
       [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($syncPasswordPtr)
   }
   $env:XU_SYNC_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

2. 将 `XU_SYNC_ACCOUNTS` 和 `XU_SYNC_SECRET` 保存在服务主机的私密环境变量中。重启沿用原来的 `XU_SYNC_SECRET`，服务用它定位账户和解密已保存的数据。
3. 配置 `XU_SYNC_GITHUB_REPO` 为私有同步仓库，例如 `newhim3/xu-schedule-sync`。配置 `XU_SYNC_GITHUB_TOKEN` 为仅能访问这个仓库、拥有 Contents 读写权限的令牌。服务会先校验仓库私有性，再将同步记录加密后写入。
4. 在仓库根目录运行 `node scripts/sync-server.cjs`。默认监听 `127.0.0.1:8766`。将可信的 HTTPS 地址反向代理到该端口，两台设备都填写这个 HTTPS 地址。

## 构建

复用 `android-webview` 的构建和签名配置。手机执行 `assembleRelease`，平板执行 `assembleRelease -PxuTablet=true`。每次构建后先将产物复制到目标文件名，再运行另一端的构建。手机版保留 `com.newhim3.xuschedule`，平板版使用 `com.newhim3.xuschedule.tablet`。
