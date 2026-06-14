# Cursorful Core Replica

[![CI](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/ci.yml)
[![Release](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/release.yml/badge.svg)](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/release.yml)

一款面向产品演示和 Bug 复现的浏览器录屏工具。

Cursorful 用来录制产品演示、功能讲解和 Bug 复现。它的目标不是做视频编辑器，而是在录制阶段通过鼠标轨迹、点击采集和自动聚焦能力，让软件操作流程更容易看懂。

## 当前能力

- 浏览器内录屏
- 鼠标轨迹和点击采集
- 自动缩放核心算法
- 本地预览与下载
- 无依赖、无构建步骤

## 产品方向

Cursorful 不做时间线编辑。

重点是：

- 更稳定地录制软件操作流程
- 自动强调用户刚刚操作的重点区域
- 导出更适合直接分享或交给专业人员后期处理的素材

路线图见 [doc/product-roadmap.md](/Users/qingyingliu/Code/cursorful-chrome-extension/doc/product-roadmap.md)。

英文版见 [README.md](/Users/qingyingliu/Code/cursorful-chrome-extension/README.md)。

## 开发

安装本地工具：

```bash
npm install
```

运行测试：

```bash
npm test
```

打包扩展：

```bash
npm run package
```

运行完整本地验证：

```bash
npm run verify
```

## 加载到 Chrome

从 `extension/` 目录加载未打包扩展即可。

示例：

```bash
google-chrome --no-first-run --disable-default-apps --no-default-browser-check --load-extension=/workspace/extension/
```

点击弹窗会打开 `studio.html`，扩展也包含 side panel 录制流程。

## 下载插件包

打包后的扩展 zip 会作为 GitHub Release 附件发布。

1. 打开仓库的 Releases 页面。
2. 下载最新版本里的 `cursorful-vX.Y.Z.zip`。
3. 在本地解压。
4. 打开 Chrome 的 `chrome://extensions`，启用开发者模式，加载解压后的目录。

## 发布流程

1. 更新 `extension/manifest.json` 中的版本号。
2. 运行 `npm test`。
3. 运行 `npm run package`。
4. 提交改动。
5. 创建并推送匹配的 `vX.Y.Z` 标签。

示例：

```bash
git tag v0.3.1
git push origin v0.3.1
```

发布流水线会校验 tag 是否匹配 `extension/manifest.json`，创建 GitHub
Release，上传扩展 zip，并附带 `SHA256SUMS`。

Chrome Web Store 仍然需要使用生成的 zip 手动发布。

## 项目治理

- 贡献指南：[CONTRIBUTING.md](/Users/qingyingliu/Code/cursorful-chrome-extension/CONTRIBUTING.md)
- 安全报告：[SECURITY.md](/Users/qingyingliu/Code/cursorful-chrome-extension/SECURITY.md)
- 许可证：[MIT](/Users/qingyingliu/Code/cursorful-chrome-extension/LICENSE)
