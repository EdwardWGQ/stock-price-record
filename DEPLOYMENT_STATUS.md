# 部署状态 · 2026-10-29

已发布用户确认的 US EQUITY MONITOR 黑底网站，包含多股票收益曲线、右侧自选股、统一及单只股票起始日期编辑、VIX／VXN 分析和明细表。

- GitHub：https://github.com/EdwardWGQ/stock-price-record，代码已上传 main，原有 MIT LICENSE 保留。
- GitHub CI：构建、43 项逻辑／数据库测试、Deno 检查及 5 项浏览器测试通过。
- Cloudflare 正式版：https://stock-atlas.pages.dev/，已部署生产构建，演示关闭，连接 Supabase。
- Cloudflare 演示版：https://demo.stock-atlas.pages.dev/，已替换为新版黑底页面，19 只股票历史快照，明确标注非实时行情。
- 本次生产部署 ID：f0ef4b69（短 ID，详见 Cloudflare Dashboard）；预览部署短 ID aacdc435。
- Supabase 项目：lkvvqfhohelebvlzwfcp，已应用初始及 baseline_dates 迁移；market-data v4 已部署，包含 Cboe VIX／VXN 官方日线接口和缓存。
- 线上验证：两个网站 HTTP 200、无页面脚本异常；演示 19 只股票和两个指数面板正常；单股起始日期编辑、周末顺延显示、手机 390px 页面已验证。
- GitHub 自动部署：尚未启用。Cloudflare Git source 连接返回 8000011，提示 Cloudflare Pages Git installation 内部异常，需要重新授权其 GitHub 应用；Actions 替代方案需要专用 Pages API token。
- 待配置：普通股票 Twelve Data API Key 和授权套餐；正式 SMTP、Supabase Site URL／Redirect URLs，并验证真实邮件注册、登录、密码重置。

正式版网页可访问，但真实普通股票行情、生产邮件和完整线上负载验收尚未完成，不能宣称已完成全球生产服务。


注册配置修复：Site URL 已设为正式域名，新增 `/auth/callback` 允许地址，最小密码 12 位及大小写／数字／符号规则，邮箱确认继续开启，匿名注册关闭。

新中英文邮件模板和 token-hash 跨浏览器回跳代码已准备；平台免费项目默认 SMTP 不允许修改邮件模板，当前未启用自定义模板，待 SMTP 注册后配置。仍兼容默认 PKCE 链接。

真实 Supabase 恢复验证：临时账户使用 admin 生成恢复链接（不发邮件），浏览器成功验证、设置新密码、清理 URL、退出并用新密码重新登录；临时账户已删除。49 项逻辑／数据库测试通过，5 项浏览器测试通过。

本地 `.env.operations.local` 中尚无 Twelve Data、SMTP 或 Cloudflare 专用 Pages Token。脚本 `scripts/operations.py` 可配置 Auth、行情 Secret、SMTP 和 GitHub 加密部署 Secret；账号本人需先注册服务并完成邮箱／发件人验证。具体步骤见 PROVIDER_SETUP.md。
