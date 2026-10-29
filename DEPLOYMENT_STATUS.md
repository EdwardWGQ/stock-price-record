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

## 国内行情改版

用户改为面向国内用户，要求寻找国内可免费调用的来源。已实现并在 Supabase 部署 `china-public` 适配器：腾讯股票搜索和报价、新浪美股历史日线，无付费 API Key。已验证云端 AAPL 搜索、报价及 105 个历史交易日，19 只原自选股均可取得新浪历史。

报价／日线在后端校验股票、交易所、币种和完整日期；小数保持精确字符串，缺失数据不会填零。数据时间、来源与过期提示显示在页面。批量日期事务和用户隔离仍生效。

国内网页接口不是官方授权 API，未发现可确认的网站转载授权，不提供 SLA；缩小用户地区不会自动获得数据权利。当前接入为技术可用性验证，不能宣称已经获得公开转载许可。海外 Cloudflare／Supabase 的国内访问质量仍需持续核验。

邮件限流修复已经上线，Brevo 免费 SMTP 完整流程已验证。普通股票未购买 API 套餐。更大流量、长期稳定和数据授权需要另外落实。

真实网站验证通过：Supabase 接口搜索 AAPL、取得报价 343.83 和 105 个历史交易日；浏览器成功添加股票并把起始日期改为 2026-07-04，采用 2026-07-06 开盘价 307.36，收益重新计算为 +11.87%。临时探测账户已删除。55 项逻辑测试和 5 项浏览器测试通过。

国内行情发布验收：GitHub Actions 40874315627 的 verify、deploy 均成功，Cloudflare 生产部署 032bd4e3 对应 ace92ca。后端 MARKET_PROVIDER=china-public，普通股票当前可从国内来源自动取得数据。


Windows 桌面版 1.0.0 已完成：安装版和免安装版生成，正式／演示页面、实际安装后启动、日期修改、原生 JSON 保存和取消保存验证通过。离线提示和导航限制已测试。应用访问已部署 HTTPS 网站，账户数据继续使用 Supabase，需要联网。未配置代码签名，Windows 可能提示未知发布者。

交付目录位于本机 Documents/US-Equity-Monitor-Desktop，两个 EXE、使用说明和 SHA256SUMS 一起提供。构建源码与文档在 desktop/、DESKTOP.md，敏感配置和 release 二进制没有进入 Git。
