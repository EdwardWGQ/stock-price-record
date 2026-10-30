Mac 桌面版使用独立窗口打开正式股票网站。使用现有账号登录即可查看自选股、收益曲线、起始日期编辑和 VIX／VXN；登录、行情与云端保存需要联网。

下载与你的 Mac 对应的文件：

- **Apple 芯片（M1、M2、M3 等）**：`US-Equity-Monitor-1.0.0-mac-arm64.dmg`。
- **Intel Mac**：`US-Equity-Monitor-1.0.0-mac-x64.dmg`。
- ZIP 文件是备用下载，解压后得到相同的 `.app`。无需安装 Python、Node.js 或下载 Source code。

支持 **macOS 13 Ventura 及更新版本**。双击 DMG，把应用拖到 Applications（应用程序），再从应用程序打开。

本版有 ad-hoc 签名，但没有 Apple Developer ID 签名和公证。首次打开可能被系统阻止；核对发布来源后，在“系统设置 → 隐私与安全性”选择“仍要打开”。如果仍报告损坏，请按照 `README-macOS.txt` 中只针对该应用的处理步骤操作。

两个架构均在 GitHub 的 Mac 环境构建，验证安装包、应用签名、原生架构以及正式登录页、演示页面和离线提示。构建验证报告及 `SHA256SUMS-macOS.txt` 随安装文件提供。

Windows 用户继续使用[原 Windows 发布](https://github.com/EdwardWGQ/stock-price-record/releases/tag/desktop-v1.0.0)。
