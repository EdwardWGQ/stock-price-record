US Equity Monitor 1.0.0 · macOS

系统要求：macOS 13 Ventura 或更新系统。无需 Python、Node.js 或源码。

选择下载：
- “关于本机”中显示“芯片 Apple M…”：下载 mac-arm64.dmg。
- “关于本机”中显示“处理器 Intel”：下载 mac-x64.dmg。
- ZIP 是备用下载，解压后同样得到 US Equity Monitor.app。

安装步骤：
1. 双击 DMG，将 US Equity Monitor 拖到 Applications（应用程序）。
2. 在“应用程序”中打开 US Equity Monitor。
3. 使用现有网站账号登录；新用户注册并点击邮箱确认链接。

本版本使用本地 ad-hoc 签名保证包内文件完整性，没有 Apple Developer ID 签名或 Apple 公证。
首次打开可能被 macOS 拦截。核对 GitHub 发布来源与 SHA256SUMS-macOS.txt 后，尝试打开一次，
到“系统设置 → 隐私与安全性 → 仍要打开”，按系统提示完成。
如系统仍报告应用损坏，可只为该应用移除隔离属性。在终端运行：
xattr -dr com.apple.quarantine "/Applications/US Equity Monitor.app"
该命令只针对这一个应用，不需要 sudo；无需关闭系统 Gatekeeper。

登录、行情和云端保存需要联网。正式网址：https://stock-atlas.pages.dev/
网页更新会自动同步，Electron 客户端本身升级需要下载新安装包。
关闭窗口后应用仍在 Dock，可点 Dock 图标重开；Command+Q 完全退出，Command+R 刷新。
邮件确认或密码重置在浏览器完成后，回到桌面应用登录。
导出交易记录时自行选择 JSON 文件的保存位置。
