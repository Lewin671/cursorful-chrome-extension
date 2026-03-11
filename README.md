# Cursorful Core Replica

Automatic presentation recorder for Chrome.

Cursorful is a Manifest V3 Chrome extension for recording product demos, walkthroughs, and bug reproductions. It is designed to make recordings clearer from the start with cursor tracking and auto-focus primitives, without becoming a video editor.

## Features

- Browser-based screen recording
- Cursor trail and click capture
- Auto-zoom core logic
- Local preview and download
- Zero dependencies and no build step

## Product Direction

Cursorful is not planned as a timeline editor.

The focus is:

- record reliably
- emphasize what matters automatically
- export better source material for sharing or downstream professional editing

See the roadmap in [doc/product-roadmap.md](/Users/qingyingliu/Code/cursorful-chrome-extension/doc/product-roadmap.md).

Chinese version: [README.zh-CN.md](/Users/qingyingliu/Code/cursorful-chrome-extension/README.zh-CN.md)

## Development

Run tests:

```bash
npm test
```

Package the extension:

```bash
npm run package
```

## Load in Chrome

Load the unpacked extension from the `extension/` directory.

Example:

```bash
google-chrome --no-first-run --disable-default-apps --no-default-browser-check --load-extension=/workspace/extension/
```

The popup opens `studio.html`. The extension also includes a side panel flow.

## Release

1. Update `extension/manifest.json` version.
2. Run `npm test`.
3. Run `npm run package`.
4. Upload the generated zip from `dist/` to Chrome Web Store Developer Dashboard.
