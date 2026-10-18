# 序 · 日程管理

一个手机优先、数据保存在本机的 Android 日程与目标管理应用。它是独立应用，不会覆盖马原刷题软件。

## 功能

- 自定义日程分类、父类和任务
- 任务支持四象限优先级与“待设置”状态
- 待办列表按紧急重要 → 紧急不重要 → 不紧急重要 → 不紧急不重要排序
- 日历支持日/课表周/月/年四级视图、双指缩放与连续月份，月视图显示完整任务和时间
- 月、年视图在现有日期上叠加实际专注热度，不新增框格或时长数字；暂停、未来计划和重复记录不计入热度
- 目标和子目标支持批注、可选预估时长和投入进度
- 目标卡片横向排布来源、投入和DDL信息；设置可选紧凑、适中、宽松三档卡片疏密，不改变字号
- 将日历任务关联到任意目标：结束后勾选才累计时长，撤销则扣回，父目标汇总子目标
- 专注栏可按今日日历或自由选择目标；支持暂停、恢复、计划结束后确认续计。使用持久化的真实时间区间计时，暂停不计入投入；应用被挂起或重启后仍可恢复
- 实际专注优先于计划：保留淡色原计划和实际轨，重叠区间不重复累计。短记录用真实时长细轨和不重叠标签保证可读
- 日时间轴长按空白建任务条，上下手柄拖动并吸附15分钟，点按编辑、长按确认删除
- 任务清单支持可选DDL日期和时间、剩余天数及批注显示开关；目标选择按父子层级展开，显示完整来源路径
- 感悟支持验证记录、置顶和按次数/最近验证排序
- 中文默认，可切换英文；三种离线自然摄影背景覆盖所有日历视图，也可关闭。照片出处与授权见 `replica/BACKGROUNDS.md`
- 完整 JSON 备份与合并恢复，包含任务、关联、DDL、专注区间、完成状态、感悟和设置，不依赖云服务
- 启动时检查更新，也可在设置中手动检查；同包名同证书覆盖安装保留数据，安装需 Android 系统确认

## 本地运行

手机版源码在 `replica/`，可用静态 HTTP 服务预览。Android 壳位于 `android-webview/`，构建时从该目录同步资源。仓库根目录的早期网页原型不用于 APK。

纯逻辑测试：`node scripts/test-goal-core.cjs`、`node scripts/test-focus-core.cjs`、`node scripts/test-heatmap-core.cjs`、`node scripts/test-web-assets.cjs`。浏览器回归（本机使用 Playwright 与 Edge，CI 使用 Chromium）：`node scripts/test-focus-ui.cjs`、`node scripts/test-choices-ui.cjs`、`node scripts/test-heatmap-ui.cjs`、`node scripts/test-card-density.cjs`、`node scripts/test-goal-ui.cjs`、`node scripts/test-planner.cjs`、`node scripts/test-refinements.cjs`、`node scripts/test-motion.cjs`。完整运行后再生成 APK。

## 密钥说明

前端不保存或暴露签名密钥和密码。发布脚本验证 APK 包名、版本、签名证书、源码一致性和成功的 Android CI；只有公开 APK 下载校验通过后才更新 `update.json`。签名文件和本地凭据不进入仓库。

