# 手机版与更新

手机版源码在 `android-webview/`，网页源码在 `replica/`。Gradle 构建时自动复制网页资源，避免两份界面不一致。

Android 已实现日程通知、闹钟响铃、5分钟稍后提醒、重复日程和重启恢复。设置中可开启通知、精确闹钟和全屏提醒权限。系统强行停止应用或厂商省电限制可能影响提醒；安装后请实际测试一次锁屏提醒。

启动及设置中的“检查更新”读取主分支 `update.json`，用户确认后下载本仓库 Release 的 APK。安装前检查包名、版本、签名，以及清单存在时的 SHA-256。系统仍需用户确认安装。

## 验证和构建

GitHub Actions 每次提交自动执行 Android 编译、提醒时间单元测试和 lint，并保存 debug APK 测试附件。该附件用于测试，不作为正式更新包。

正式发布须使用同一私钥签名。密钥及密码均不得提交仓库。环境变量为 `XU_SCHEDULE_KEYSTORE`、`XU_SCHEDULE_KEYSTORE_PASSWORD`、`XU_SCHEDULE_KEY_ALIAS`、`XU_SCHEDULE_KEY_PASSWORD`。

1. 增加 `android-webview/app/build.gradle` 的版本号。
2. 执行 `gradle -p android-webview assembleRelease testDebugUnitTest lintDebug` 并验证签名。
3. 上传 Release 附件 `xu-schedule.apk`。
4. 确认附件可下载，再更新主分支 `update.json` 的 versionCode、versionName、apkUrl、sha256、releaseNotes。

目前正式 Release 尚未发布，更新清单保留空下载地址，避免提示用户下载不存在的安装包。浏览器版不会在关闭页面后可靠响铃，闹钟功能须使用 Android 安装版。
