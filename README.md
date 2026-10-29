# stock-price-record · US EQUITY MONITOR

US stock price tracker with market fear sentiment analysis.

本项目采用原来的黑底股票监控网站，采用原始页面布局：橙色标题、多只股票累计收益曲线、右侧自选股、VIX／VXN 波动率区域及下方明细表。前端使用 React + TypeScript + Chart.js，Cloudflare Pages 托管；后端使用 Supabase。

## 第一次使用：直接打开网站

如果只是使用网站，不需要下载源码，也不需要安装 Node.js 或 Python。

1. 打开 **[正式网站](https://stock-atlas.pages.dev/)**。
2. 首次使用点击 **“创建账户”**。
3. 输入自己的邮箱和密码。密码至少 **12 位**，包含大小写字母、数字和符号。
4. 查收确认邮件，点击 **“验证邮箱”** 链接；未收到时检查垃圾邮件。
5. 邮箱验证后登录，在顶部搜索股票代码（例如 `AAPL`），选择股票加入自选。
6. 点击顶部 **“修改起始日期”** 可统一修改；点击股票旁的 **“◷”** 可单独修改。先查询预览，再确认保存。
7. 忘记密码时点击 **“重置密码”**，填写注册邮箱，打开最新重置邮件设置新密码。不要把密码告诉别人。

新账户的自选股最初为空，需要自行添加。每个账户的数据独立保存。当前发信使用免费套餐，受每日和每小时额度限制；邮件可能延迟。

如果想不注册就看界面，打开 **[在线演示](https://demo.stock-atlas.pages.dev/)**。演示使用历史快照，修改仅保留在当前页面，刷新后重置，不是实时行情。

## 从 GitHub 下载，在另一台 Windows 电脑运行演示版

### 1. 安装环境

- 使用普通 Windows 电脑和现代浏览器，例如 Edge 或 Chrome。
- 到 **[Node.js 官网](https://nodejs.org/)** 安装 **Node.js 24 LTS**，保持默认安装选项。npm 会一同安装。
- 首次下载源码和安装依赖需要联网。这个 GitHub 项目使用 TypeScript／React，运行演示不需要安装 Python，也不需要注册 Supabase。

安装完成后重新打开终端，分别输入下面两条命令检查：

```powershell
node --version
npm.cmd --version
```

第一条应显示 `v24...`，第二条显示 npm 版本号。

### 2. 下载并解压

1. 打开 **[GitHub 仓库](https://github.com/EdwardWGQ/stock-price-record)**。
2. 点击绿色 **Code（代码）** → **Download ZIP（下载 ZIP）**。
3. 下载后右键 ZIP → **全部解压缩**，例如解压到 `D:\stock-price-record-main`。
4. 打开解压后的文件夹，确认能看到 `package.json`（Windows 可能显示为 `package`）、`src` 和 `README.md`。如果又有一层同名文件夹，进入有这些文件的那一层。

**不要在 ZIP 的预览窗口里运行，也不要双击 `index.html`。** 文件地址栏显示普通文件夹路径、且不含 `.zip`，通常说明已经解压。

### 3. 在项目文件夹打开 PowerShell

在文件夹空白处右键 → **在终端中打开**，选择 PowerShell。

也可以在资源管理器地址栏输入 `powershell` 后按 Enter。终端当前目录应是含 `package.json` 的项目文件夹。如果不是，先输入（用自己的实际解压路径替换）：

```powershell
cd "D:\stock-price-record-main"
```

### 4. 首次安装依赖

输入下面命令，等待完成再继续：

```powershell
npm.cmd ci
```

安装成功后会出现 `node_modules` 文件夹。第一次通常需要几分钟；以后在同一文件夹运行时，不必每次重新安装。

### 5. 启动演示

在同一个 PowerShell 窗口中依次输入：

```powershell
$env:VITE_DEMO_MODE="true"
npm.cmd run dev -- --open
```

浏览器会自动打开。没有自动打开时，查看终端的 **Local** 地址，通常为：

**[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

若 5173 被占用，程序可能使用 5174 等其他端口，**以终端实际显示的地址为准**。

运行时保持终端窗口打开。停止网站按 **Ctrl+C**；停止后本地网址不能继续使用。

### 6. 下次再启动

在同一项目文件夹打开 PowerShell，重新执行第 5 步的两条命令即可。`$env:VITE_DEMO_MODE` 只在当前终端有效，换新窗口需要重新设置。

### 常见问题

- **找不到 node 或 npm**：安装 Node.js 24 后，关闭并重新打开终端；仍不行可重启电脑。
- **提示禁止运行 npm.ps1**：按本文使用 `npm.cmd`，不用修改 Windows 执行策略。
- **提示找不到 package.json**：终端目录不对，进入包含 `package.json` 的那一层文件夹再运行。
- **提示找不到 vite／依赖**：先运行 `npm.cmd ci`；安装失败时检查网络，成功后再启动。
- **页面要求配置 Supabase**：演示变量没生效。在启动网站的同一个 PowerShell 窗口设置 `$env:VITE_DEMO_MODE="true"` 后重启。
- **浏览器打不开／连接被拒绝**：检查终端是否还在运行，使用终端显示的 Local 地址，不要在另一台电脑上把 `127.0.0.1` 当作你的电脑地址。
- **演示修改刷新后丢失**：这是演示行为；需要持久保存的用户请使用正式网站或配置自己的后端。
- **没有 start-demo.cmd**：本文命令适用于 GitHub ZIP，无需启动脚本。之前单独提供的本机启动文件不是 GitHub 下载运行的必要条件。

## 自己部署真实版本

下载源码运行演示，不会自动获得站点维护者的 Supabase、SMTP 或 Cloudflare 密钥。要部署自己的真实版本，需要创建自己的 Supabase 项目、应用 `supabase/migrations` 中的迁移、部署 `market-data` 函数、配置 SMTP、Auth 回跳地址和前端变量，并替换部署流程中的项目／账户标识。完整配置见下方章节和 [PROVIDER_SETUP.md](PROVIDER_SETUP.md)。源码的 MIT 许可不包含第三方行情数据转载授权。

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

## 技术结构

仓库中的网页前端使用 TypeScript + React + Chart.js；后端使用 Supabase Edge Functions（TypeScript）和 PostgreSQL（SQL）。`scripts/operations.py` 是维护者配置云端服务的 Python 辅助脚本，演示运行不依赖它。

早期 Python／Flask 本机程序不是此仓库的启动入口。GitHub 下载者请按上面的 PowerShell 步骤运行。

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
