# stock-price-record · US EQUITY MONITOR

US stock price tracker with market fear sentiment analysis.

本项目采用原来的黑底股票监控网站，采用原始页面布局：橙色标题、多只股票累计收益曲线、右侧自选股、VIX／VXN 波动率区域及下方明细表。前端使用 React + TypeScript + Chart.js，Cloudflare Pages 托管；后端使用 Supabase。

## 这次修改

- 顶部“修改起始日期”：统一修改全部股票的起始记录日期。
- 右侧股票旁“◷”：单独修改这一只股票的起始日期。
- 明细表的 START DATE 可点击编辑。
- 沿用原网站计算口径：选中日期当天或之后首个有数据交易日的**开盘价**作为起始价。
- 修改前先预览实际采用的交易日及开盘价，确认后重算累计收益和曲线。
- 图表按完整交易日期对齐；某只股票缺少某一天的数据时留空，不错位。
- 批量修改在数据库事务中保存；任何股票发生版本冲突则整批回滚。
- 行情失败、没有历史开盘价、非法日期时保持原记录，不猜测或补造价格。
- 保留用户登录和私有数据权限、交易时间编辑、中英文、导出等已实现功能，界面统一为黑底监控风格。

## 本机原网站

真正运行的原程序是 `D:/stock_server.py`，已经加入相同的起始日期功能并重启。`C:/Users/王国庆/stock_server.py` 已同步更新。原始程序备份留在 `artifacts`，不进入 GitHub。

本机打开 `http://127.0.0.1:8080/`，登录方式沿用原来本机设置。这个 Flask 本地程序不适合作为全球用户共用的生产后端，公网版本使用 Supabase Auth 和独立用户数据。

## 项目运行

需要 Node.js 22.12+，建议 24。

```powershell
npm ci
# 本机 .env.local 已配置指定 Supabase；新机器复制示例并填写。
Copy-Item .env.example .env.local
npm run dev
```

要看演示，设置 `VITE_DEMO_MODE=true`。演示使用原网站的 19 只股票历史快照和示例日开盘价；演示日开盘价仅用于体验日期编辑，不能用于投资决策。生产环境必须 `VITE_DEMO_MODE=false`。

## GitHub 和 Cloudflare

上传这个项目的源码，提交 package-lock.json 和后端 deno.lock。`.gitignore` 已排除 `.env.local`、依赖、构建目录和测试图片；不要上传服务器秘密密钥。

Cloudflare Pages 的 `stock-atlas` 项目已创建，默认域名 `stock-atlas.pages.dev`，生产分支 `main`，构建命令 `npm run build`，输出 `dist`，Node.js 24。GitHub 源码仓库：https://github.com/EdwardWGQ/stock-price-record。

正式版已发布：https://stock-atlas.pages.dev/。演示版已更新：https://demo.stock-atlas.pages.dev/，使用明确标注的历史快照。普通股票已切换国内网页行情来源：腾讯报价与搜索、新浪日线；无需付费 API Key。Brevo 免费 SMTP、注册及密码重置已完成真实邮件验证。

构建变量：

- `VITE_SUPABASE_URL=https://lkvvqfhohelebvlzwfcp.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`：从 Supabase API Keys 复制 publishable key。
- `VITE_DEMO_MODE=false`

公开 publishable key 可以用于浏览器；Supabase secret/service_role、Twelve Data Key 不能出现在 `VITE_` 环境变量或仓库中。

## Supabase

股票专用项目 ID 是 `lkvvqfhohelebvlzwfcp`。数据库初始迁移及新增 `baseline_dates` 迁移已经应用；当前项目不要重复建表。市场函数 `market-data` 已更新，历史响应含每日开盘价和收盘价。

后端 Secret 配置：

- `MARKET_PROVIDER=china-public`：当前国内网页行情适配器，无需 API Key。
- `TWELVE_DATA_API_KEY`：仅选择 `MARKET_PROVIDER=twelve-data` 时需要。
- `ALLOWED_ORIGINS`：默认只允许 `https://stock-atlas.pages.dev`。使用自定义域名时改为精确地址列表。
- `MARKET_UPSTREAM_PER_MINUTE`：按行情套餐额度设定全局每分钟预算，默认 8。

Supabase Auth 需要正式域名作为 Site URL 和精确 Redirect URLs，启用 Email confirmation，关闭匿名注册，并配置自己的 SMTP 发信服务。远程邮件和回跳配置已完成；国内网页行情适配器已部署。

函数平台设置 `verify_jwt=false` 以兼容新 publishable key，处理器仍通过 Auth `getUser` 验证登录用户。数据表 RLS 限制每个用户自己的记录；市场缓存 RPC 只允许后台角色调用。

更新函数：

```powershell
npx supabase login
npx supabase functions deploy market-data --project-ref lkvvqfhohelebvlzwfcp --use-api --no-verify-jwt
```

新空项目先按 Supabase CLI 帮助执行迁移；本项目迁移版本与远程一致。

## 国内用户与行情来源

当前面向国内用户，自动行情保持美股范围。搜索／当前报价采用腾讯财经网页接口，历史日开盘和收盘数据采用新浪财经 JSONP 接口；后端仅解析 JSON，不执行来源脚本。VIX／VXN 继续采用 Cboe 官方日线。

这些网页接口当前可以无付费 Key 调用，**不是正式签约或有 SLA 的数据 API，也没有核实到允许网站转载的明示许可**。只面向国内用户并不会自动改变数据授权要求。不要把它称作官方授权、永久免费、保证稳定或可无限调用的服务；进一步公开运营应与来源方确认适用用途。

请求有共享缓存、每用户限流和全局限流，数据失败不会按零处理，不会悄悄覆盖基线。报价使用来源时间戳，无法确认开闭市时显示未知；超过 15 分钟或请求失败后使用的旧数据标记过期。新浪历史日线的复权口径没有被服务保证，应在遇到拆股和分红时另行核对，本项目不声称它是未复权总回报数据。

当前 Cloudflare 和 Supabase 仍在海外基础设施上，面向国内用户不代表已迁移国内托管；实际国内网络访问质量需要持续测量。

切换国内来源：`python scripts/operations.py china`。如以后获得正式授权的 Twelve Data Key，可执行 `python scripts/operations.py market`，该命令同时切换 provider。

## 验证

```powershell
npm run build
npm test
npm run test:e2e
npx deno check --config supabase/functions/market-data/deno.json supabase/functions/market-data/index.ts
```

包含数据库权限和事务回滚测试、日期收益计算、休市顺延、缺失数据、手机页面和浏览器操作。演示测试不代替真实行情及邮件服务验收。

## GitHub Actions 自动部署

如果采用 Actions 部署而不使用 Cloudflare Git 集成，仓库 Settings → Secrets and variables → Actions 设置：

- Secret `CLOUDFLARE_API_TOKEN`：只授予指定 Cloudflare 账户 Pages Write 的 API token。
- Variable `CLOUDFLARE_ACCOUNT_ID=1d90b9c72268f9325c5a4c3d2e49196f`。
- Variable `VITE_SUPABASE_URL=https://lkvvqfhohelebvlzwfcp.supabase.co`。
- Variable `VITE_SUPABASE_PUBLISHABLE_KEY`：公开 publishable key。
- Variable `CLOUDFLARE_DEPLOY_ENABLED=true`：配置完整后启用部署。

工作流只在 main 的 push 和全部检查通过后部署到 stock-atlas。Cloudflare Git 集成也会自动部署，应选择一种方式，避免重复部署。服务端 Twelve Data Key 和 SMTP 凭据只留在 Supabase 后端，不能放进前端构建变量。

Cloudflare GitHub 应用连接报错 8000011，目前使用 GitHub Actions 作为部署方式。专用 Pages Token 已加密配置，自动部署已启用；main 更新在验证通过后发布到正式站点。

## 生产配置修复

Supabase Site URL 已设置为 `https://stock-atlas.pages.dev`，允许正式 `/auth/callback`，最小密码 12 位且要求大小写、数字和符号，继续开启邮箱确认和关闭匿名注册。

确认／恢复模板位于 `supabase/templates/`，提供中英文邮件和跨浏览器 token-hash 验证。当前已使用 Brevo 免费自定义 SMTP，两种邮件模板已启用；`python scripts/operations.py smtp` 可重新配置 SMTP 和模板。前端也兼容默认 PKCE 邮件回跳。

真实服务和自动部署凭据见 [PROVIDER_SETUP.md](PROVIDER_SETUP.md)。本地 `.env.operations.local` 已被忽略，不上传源码。操作脚本不输出密钥。Cloudflare 登录用于手工部署，长期 GitHub 自动部署需要专用 Pages API Token。


Brevo 免费 SMTP 已完成连接并启用中英文确认／密码恢复模板，注册发信请求和 SMTP 认证／发送验证成功。真实注册邮件确认、正式网站登录和邮件密码重置闭环已通过，旧临时密码已失效；国内网页行情已接入，无付费 API Key；公开使用的数据转载许可仍未核实。

免费邮件默认限制为每小时 30 封，Brevo 免费套餐的每日额度另外生效。已修正此前默认每小时 2 封造成密码重置邮件未送出的配置。
