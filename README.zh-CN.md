# Cursorful Core Replica

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

运行测试：

```bash
npm test
```

打包扩展：

```bash
npm run package
```

## 加载到 Chrome

从 `extension/` 目录加载未打包扩展即可。

示例：

```bash
google-chrome --no-first-run --disable-default-apps --no-default-browser-check --load-extension=/workspace/extension/
```

点击弹窗会打开 `studio.html`，扩展也包含 side panel 录制流程。

## 发布

1. 更新 `extension/manifest.json` 中的版本号。
2. 运行 `npm test`。
3. 运行 `npm run package`。
4. 将 `dist/` 中生成的 zip 上传到 Chrome Web Store Developer Dashboard。
