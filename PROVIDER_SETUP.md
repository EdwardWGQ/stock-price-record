# 完成真实行情、邮件和自动部署

网站和 Supabase 数据库已部署。回跳地址、邮箱验证和密码规则已配置；以下凭据需要账户本人创建。

## 1. 自动部署

打开 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)，创建只属于当前账户的令牌：

- 权限：Account → Cloudflare Pages → Edit。
- 账户范围：只选择你的 Cloudflare 账户。
- 不需要 DNS、所有账户或全部资源权限。

把令牌填入本机 `.env.operations.local` 的 `CLOUDFLARE_API_TOKEN=`。该文件已被 `.gitignore` 排除。然后运行：

```powershell
python scripts/operations.py deploy
```

脚本将令牌通过 GitHub 公钥加密保存到 Actions Secret，并启用检查后部署。不使用会过期的 Wrangler OAuth 登录凭据作为长期 CI Token。完成后 main push 会执行完整验证并部署。

## 2. 股票行情

在 [Twelve Data](https://twelvedata.com/account) 注册并取得 API Key。需要面向公众展示的行情，请确认[商业套餐](https://twelvedata.com/business)的市场覆盖、实时／延迟条件和再分发授权；不要把个人测试额度当成全球无限服务。

把 Key 填入 `.env.operations.local` 的 `TWELVE_DATA_API_KEY=`，运行：

```powershell
python scripts/operations.py market
```

API Key 只保存到 Supabase 函数 Secret。VIX／VXN 当前已采用 Cboe 官方日线，不依赖这把普通股票 Key。

## 3. 注册邮件

已于 2026-10-29 为 `wanggq908@gmail.com` 提交 Brevo 免费账户注册，未购买套餐或绑定信用卡。账户登录密码仅保存在本机忽略文件 `.env.operations.local`。当前正在完成邮箱／设备验证，SMTP 凭据尚未生成或写入 Supabase。

核对 [Brevo 官方定价](https://www.brevo.com/pricing/)：免费套餐无需信用卡，账户获准发信后每日最多 300 封。免费不代表无限额度，正式运营需要跟踪邮件发送量。

建议选择支持 SMTP 的 [Brevo](https://www.brevo.com/) 或 [Resend](https://resend.com/docs/send-with-supabase-smtp)。Brevo 可从验证发件人开始；长期公开发信应使用你控制的域名并配置 SPF、DKIM 和 DMARC。Resend 需要验证自己的域名才能向公众正式发送，默认测试域名不适合正式注册邮件。

账户注册、邮箱／发件人验证和付费套餐确认由账户本人完成。取得凭据后填入 `.env.operations.local`：

```text
SMTP_HOST=服务商提供的主机
SMTP_PORT=587
SMTP_USER=服务商提供的用户名
SMTP_PASS=服务商提供的SMTP密钥
SMTP_FROM_EMAIL=已验证的发件地址
SMTP_SENDER_NAME=US Equity Monitor
```

运行：

```powershell
python scripts/operations.py smtp
```

它会写入 Supabase SMTP、启用中英文确认／重置邮件模板并检查配置。Supabase 免费项目使用默认发信服务时拒绝修改模板；默认服务不能向所有访客发送正式邮件。

模板链接指向 `https://stock-atlas.pages.dev/auth/callback`，验证后立即清理 URL 中的令牌。用户可以跨浏览器打开邮件。配置模板前兼容 Supabase 默认 PKCE 回跳，同一浏览器打开默认重置邮件。

## 4. 最后的真实验证

SMTP 配置后用实际收件邮箱检查注册、确认、登录、密码重置。行情 Key 配置后检查股票搜索、历史开盘价、当前报价、起始日期重算，并核对实际市场延迟。自动部署通过一轮 GitHub Actions 后再确认其网站部署结果。

本机配置脚本优先使用 `.env.operations.local`，也可以使用环境变量；Windows 上可读取已登录的 Supabase CLI 凭据。脚本不输出秘密值。Linux 上设置 `SUPABASE_ACCESS_TOKEN` 并安装 PyNaCl（仅自动部署设置所需）。

## 免费股票行情的实际限制

核对日期：2026-10-29。Twelve Data Basic 为 $0，8 次 API credit／分钟、800／日，但属于测试及内部 non-display 使用；[条款](https://twelvedata.com/terms)要求外部展示及再分发得到相应授权。[Finnhub 条款](https://finnhub.io/terms-of-service)也要求第三方分享／再分发取得书面许可。Alpha Vantage 默认许可为个人、非商业用途，Marketstack 免费版为 100 次／月、非商业用途。

这些免费个人 API 不能未经确认就作为全球公共网站的统一行情来源。本项目未注册或启用新的股票免费 API，也没有购买任何行情套餐。公开服务可评估用户自行导入记录，或者联系供应商确认可公开展示的低额度／延迟数据授权；改动产品方式需要用户确认。
