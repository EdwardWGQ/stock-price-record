# Windows 桌面应用

US Equity Monitor 桌面版使用独立窗口打开正式网站，可用已有账户登录。界面、股票曲线、起始日期编辑、VIX／VXN 和明细表与网站一致；网站更新后桌面客户端打开时自动使用最新网页。

## 使用者

支持 Windows 10／11 的 64 位电脑。

- 安装版：运行 `US-Equity-Monitor-1.0.0-x64-nsis.exe`，按向导安装，可选择安装路径，创建桌面及开始菜单快捷方式。
- 免安装版：直接运行 `US-Equity-Monitor-1.0.0-x64-portable.exe`，首次打开可能需要等待解包。
- 无需安装 Node.js、Python 或下载项目源码。
- 登录、行情和记录保存需要联网。连接失败时显示重试页面；界面顶部“应用”菜单可以切换正式版和演示。
- 邮箱确认和密码重置链接默认在系统浏览器打开。完成后回到桌面应用登录；浏览器和桌面版的登录会话相互独立。
- 导出数据时会询问文件保存位置。登录会话保存在本机用户目录，由该 Windows 用户控制。

本次构建没有购买代码签名证书，因此 Windows 可能显示“未知发布者”。仅从可信来源获取安装文件并核对项目发布信息；此包没有自动安装系统级服务或要求管理员权限。

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

客户端启用了 Chromium sandbox、context isolation、禁用 Node.js 网页集成和远程权限请求，网页只有受控的 JSON 导出接口：校验格式和大小，再由用户选择保存位置；网页不能指定本机路径或任意读写文件。仅正式及演示域名可在窗口内导航，其他 HTTPS 链接经确认后在系统浏览器打开。

安装器自动更新尚未配置；网页内容会持续更新，但 Electron 运行时升级需要重新打包安装新版。
