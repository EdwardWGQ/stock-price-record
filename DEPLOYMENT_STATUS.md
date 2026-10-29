# 部署状态 · 2026-10-29

已发布原版风格的 US EQUITY MONITOR 黑底网站，保留累计收益多曲线、右侧自选股、VIX／VXN 分析和明细表，支持统一／单股修改起始记录日期。

## 已完成

- 正式网站：https://stock-atlas.pages.dev/。
- 演示：https://demo.stock-atlas.pages.dev/，19 只股票历史快照，明确标记非实时与示例开盘价。
- GitHub：https://github.com/EdwardWGQ/stock-price-record，MIT LICENSE 保留。
- 自动部署：GitHub Actions 已启用；main 更新通过验证后发布至 Cloudflare Pages。已验证整轮 verify 与 deploy 成功。
- Supabase：项目 lkvvqfhohelebvlzwfcp；初始及 baseline_dates 迁移已应用，market-data v4 包含开盘／收盘历史接口及 Cboe VIX／VXN 官方日线缓存。
- 数据保护：行级权限、精确十进制、UTC／时区处理、版本冲突与批量日期事务。
- Auth：正式站点和 /auth/callback 已配置；密码最少 12 位且含大小写、数字与符号；邮箱确认开启，匿名注册关闭。
- 免费邮件：Brevo 邮箱／手机／发件人验证完成，网站专用 SMTP Key active，Supabase 自定义 SMTP 与中英文确认／重置模板生效。
- 邮件限流：发现默认每小时 2 封导致重置邮件未发；已改成自定义 SMTP 每小时 30 封，配置脚本同步修正。Brevo 免费套餐每日额度仍独立生效。
- 真实邮件验收：注册邮件已实际收到并点击确认；正式网站登录成功；重新发送的恢复邮件后台记录发送时间，用户已设置新密码，旧临时密码已验证不能登录。用户的新密码未被读取或保存。
- 自动化验证：49 项逻辑／数据库测试、5 项浏览器测试、生产构建和 Deno 检查通过。

## 仍未完成

普通股票公开行情没有配置 API Key。已核对 Twelve Data、Finnhub、Alpha Vantage、Marketstack 和其他候选；没有确认允许本网站面向全球第三方公开展示的免费统一行情授权。没有购买行情套餐，也没有把个人测试免费 Key 接入公共生产网站。

用户已选择保留自动行情，等待合适的公开数据授权。当前不增加 CSV 导入，也不购买套餐或接入用途未经确认的个人免费 API。

SMTP Key 页面显示到期日 2027-10-29，连续 90 天不使用也会过期，需要届时更换。所有账户凭据只在本机忽略文件或服务端 Secret，不在 GitHub。

网页、登录和免费邮件已可使用；完整自动股票行情以及面向目标流量的负载和恢复演练仍需完成，不能宣称全球无限免费行情或绝对零错误。

邮件限流修复提交 60ec7dc 的 GitHub Actions 40871926289 已完成，verify 与 deploy 均成功，Cloudflare 生产部署 c2266be2。正式与演示网站 HTTP 200。
