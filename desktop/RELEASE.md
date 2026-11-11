# 市场观测 · 桌面版 {{version}}

本版更新面向用户的 Windows 和 Mac 下载包，并加入后续版本的更新提示。

- 客户端启动后检查已发布的适用版本；有新版时可打开下载页查看更新说明并下载。
- 帮助菜单新增“检查更新”和“下载最新版本”。网络暂时不可用时仍可正常使用应用。
- 直接访问最新版线上“市场观测”网站，可使用已上线的美股监测、市场分析及交易日志。界面和网页功能继续随网站更新。
- Windows、Apple 芯片 Mac、Intel Mac 使用同一发布页和版本号，提供安装文件、校验值与构建验证报告。

## 选择下载

- Windows 10 / 11 64 位：安装版 `US-Equity-Monitor-{{version}}-x64-nsis.exe`；免安装版 `US-Equity-Monitor-{{version}}-x64-portable.exe`。
- Apple 芯片 Mac：`US-Equity-Monitor-{{version}}-mac-arm64.dmg`。
- Intel Mac：`US-Equity-Monitor-{{version}}-mac-x64.dmg`。Mac 要求 macOS 13 或更新版本；ZIP 是备用下载。

无需 Python、Node.js 或项目源码。GitHub 的 Source code 文件供开发者使用。

## 从 1.0.0 升级

退出旧版后，Windows 安装版运行新版安装器，免安装版运行新版文件；Mac 将新版应用放入 Applications。
已有网站账号和云端记录可以继续使用。1.0.0 没有更新提示，需要先手动下载本版；从本版起会提示后续版本，由用户下载并安装。

应用需要联网。Windows 包没有代码签名证书；Mac 包使用 ad-hoc 签名，没有 Apple Developer ID 签名和公证。安装方法和系统提示处理见下载文件中的 README。

`SHA256SUMS.txt` 包含所有安装文件的 SHA-256 校验值；`release-manifest.json` 记录版本、构建源码提交和文件校验值。
