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

正式发布由 `.github/workflows/release.yml` 自动执行：验证已通过的构建记录、源码摘要、APK 签名、包名、版本和网页资源；上传 Release；验证公开下载的 SHA-256；最后更新主分支 `update.json`。可在 Actions 中重新运行失败的发布，无需覆盖已有附件。

发布输入为 `release-artifacts/xu-schedule.apk` 和 `version.json`。后续版本必须重新构建、用同一密钥签名，并更新版本、校验值与对应通过的构建记录；密钥始终留在本机。浏览器版关闭页面后不会可靠响铃，闹钟功能须使用 Android 安装版。
