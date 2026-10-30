# Windows 和 Mac 桌面应用

US Equity Monitor 桌面版使用独立窗口打开正式网站，可用已有账户登录。界面、股票曲线、起始日期编辑、VIX／VXN 和明细表与网站一致；网站更新后桌面客户端打开时自动使用最新网页。

## 使用者

支持 Windows 10／11 的 64 位电脑。

打开 **[桌面版下载页面](https://github.com/EdwardWGQ/stock-price-record/releases/tag/desktop-v1.0.0)**，在 **Assets（资源）** 中下载下面的 EXE 文件。GitHub 自动生成的 `Source code (zip)` 和 `Source code (tar.gz)` 是开发源码，普通用户无需下载。

- 安装版：运行 `US-Equity-Monitor-1.0.0-x64-nsis.exe`，按向导安装，可选择安装路径，创建桌面及开始菜单快捷方式。
- 免安装版：直接运行 `US-Equity-Monitor-1.0.0-x64-portable.exe`，首次打开可能需要等待解包。
- 无需安装 Node.js、Python 或下载项目源码。
- 登录、行情和记录保存需要联网。连接失败时显示重试页面；界面顶部“应用”菜单可以切换正式版和演示。
- 邮箱确认和密码重置链接默认在系统浏览器打开。完成后回到桌面应用登录；浏览器和桌面版的登录会话相互独立。
- 导出数据时会询问文件保存位置。登录会话保存在本机用户目录，由该 Windows 用户控制。

本次构建没有购买代码签名证书，因此 Windows 可能显示“未知发布者”。仅从可信来源获取安装文件并核对项目发布信息；此包没有自动安装系统级服务或要求管理员权限。

## Mac 使用者

打开 **[Mac 桌面版下载页面](https://github.com/EdwardWGQ/stock-price-record/releases/tag/desktop-mac-v1.0.0)**。支持 **macOS 13 Ventura 及更新版本**。

- Apple 芯片（“关于本机”显示 Apple M…）：下载 `US-Equity-Monitor-1.0.0-mac-arm64.dmg`。
- Intel 芯片（“关于本机”显示 Intel）：下载 `US-Equity-Monitor-1.0.0-mac-x64.dmg`。
- 双击 DMG，把应用拖到 Applications（应用程序），从应用程序打开并登录。ZIP 是备用下载；无需 Python、Node.js 或源码。
- Mac 包使用 ad-hoc 签名，没有 Apple Developer ID 签名和公证。首次打开如被拦截，核对发布来源后到“系统设置 → 隐私与安全性”选择“仍要打开”。如仍提示损坏，请查看下载页面的 `README-macOS.txt`，无需关闭整个系统的 Gatekeeper。
- `Command+R` 刷新，`Command+Q` 退出；关闭窗口后仍可点 Dock 图标重新打开。网站账号、联网要求和数据导出行为与 Windows 版一致。

## 开发者构建

网站前端依赖与桌面依赖独立保存。桌面壳不包含 `.env.local`、SMTP Key、Cloudflare Token 或 Supabase 秘密密钥。

需要 Node.js 24 和 Windows 构建环境：

```powershell
cd desktop
npm.cmd ci
npm.cmd test
npm.cmd run start
npm.cmd run dist
```

输出目录是 `desktop/release/`；安装器、免安装程序和 `win-unpacked/` 文件夹会在那里生成。不需要先编译 React 前端，因为桌面版访问现有 HTTPS 网站。

Mac 在原生 macOS 环境运行 `npm ci`、`npm test`、`npm run dist:mac -- --arm64`（Intel 改为 `--x64`）。先按 `.github/workflows/desktop-mac.yml` 的图标步骤生成 `assets/icon.icns`。也可以在仓库 Actions 中运行 **Build macOS Desktop**，分别使用原生 Intel 和 Apple 芯片环境构建 DMG／ZIP、验证签名及启动页面，再上传草稿发布。`node verify-mac.cjs` 验证打包结果，需要设置 `EXPECTED_ARCH=arm64` 或 `x64`。

客户端启用了 Chromium sandbox、context isolation、禁用 Node.js 网页集成和远程权限请求，网页只有受控的 JSON 导出接口：校验格式和大小，再由用户选择保存位置；网页不能指定本机路径或任意读写文件。仅正式及演示域名可在窗口内导航，其他 HTTPS 链接经确认后在系统浏览器打开。

安装器自动更新尚未配置；网页内容会持续更新，但 Electron 运行时升级需要重新打包安装新版。

## 已完成的构建验证

已生成安装版和免安装版。实际安装到隔离测试目录后，验证登录页、演示切换、19 条股票记录导出及取消保存；直接运行免安装版验证了登录窗口和起始日期修改。离线提示、导航限制和导出格式／大小校验均已检查。两个最终 EXE 的 SHA-256 值随交付文件提供。
