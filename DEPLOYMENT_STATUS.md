# 部署交接 · 2026-10-29

本次按用户原来的截图重新制作，主页面已恢复 US EQUITY MONITOR 黑底、多线收益曲线、右侧自选股及波动率区域；加入统一及单只股票起始记录日期编辑。

- 本机原网站 `http://127.0.0.1:8080/` 已修改，活动程序为 `D:/stock_server.py`，C 盘同名程序已同步。
- Supabase 项目 `lkvvqfhohelebvlzwfcp`：初始迁移及 `20261029085308_baseline_dates` 已应用。
- `market-data` 后端函数已更新，历史报价包含开盘价，缓存版本已变更。
- Cloudflare Pages `stock-atlas` 项目已存在。旧 `https://demo.stock-atlas.pages.dev` 演示仍需替换；当前会话 Cloudflare 工具不可用，未能上传本次改版。
- 当前改版预览可在本机 `http://127.0.0.1:4180/` 查看；示例历史快照，非实时行情。
- GitHub 仓库连接、Twelve Data Key、生产邮件和回跳地址仍需配置。

本机 VIX／VXN 缓存键错误已修复，两个指数改用 Cboe 官方日线；主图高度已调整并添加分析／明细跳转入口。

Supabase 市场函数 v4 已部署：新增 Cboe VIX／VXN 官方日线接口，独立于普通股票行情 Key。前端生产版本同步调用并展示来源和数据日期。

GitHub Actions 检查后自动部署流程已准备；尚未上传远程仓库。Cloudflare CLI 的账号授权未完成并已超时，GitHub 账号授权尚未完成，仓库链接未提供。Twelve Data Key 与 SMTP／Auth 回跳仍未配置。

GitHub 仓库已确认：https://github.com/EdwardWGQ/stock-price-record；当前账号具有写入权限，仓库原有 MIT 许可证保留。Cloudflare 正在等待设备授权。
