# Cursorful Core Replica

[![CI](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/ci.yml)
[![Release](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/release.yml/badge.svg)](https://github.com/Lewin671/cursorful-chrome-extension/actions/workflows/release.yml)

Browser-first recorder for product demos and bug reproduction.

Cursorful is a Manifest V3 Chrome extension for recording product demos, walkthroughs, and bug reproductions. Its job is to make software workflows easier to follow with cursor tracking and automatic focus, without becoming a video editor.

## Features

- Browser-based screen recording
- Cursor trail and click capture
- Auto-zoom core logic
- Local preview and download
- Zero dependencies and no build step

## Product Direction

Cursorful is not planned as a timeline editor.

The focus is:

- record software workflows reliably
- automatically focus attention on the key action
- export cleaner source material for sharing or downstream professional editing

See the roadmap in [doc/product-roadmap.md](/Users/qingyingliu/Code/cursorful-chrome-extension/doc/product-roadmap.md).

Chinese version: [README.zh-CN.md](/Users/qingyingliu/Code/cursorful-chrome-extension/README.zh-CN.md)

## Development

Install local tooling:

```bash
npm install
```

Run tests:

```bash
npm test
```

Package the extension:

```bash
npm run package
```

Run the full local verification:

```bash
npm run verify
```

## Load in Chrome

Load the unpacked extension from the `extension/` directory.

Example:

```bash
google-chrome --no-first-run --disable-default-apps --no-default-browser-check --load-extension=/workspace/extension/
```

The popup opens `studio.html`. The extension also includes a side panel flow.

## Download a Package

Packaged extension zips are published as GitHub Release assets.

1. Open the repository Releases page.
2. Download `cursorful-vX.Y.Z.zip` from the latest release.
3. Unzip it locally.
4. In Chrome, open `chrome://extensions`, enable Developer mode, and load the
   unpacked unzipped directory.

## Release Process

1. Update `extension/manifest.json` version.
2. Run `npm test`.
3. Run `npm run package`.
4. Commit the change.
5. Create and push a matching `vX.Y.Z` tag.

Example:

```bash
git tag v0.3.1
git push origin v0.3.1
```

The release workflow validates that the tag matches `extension/manifest.json`,
creates a GitHub Release, uploads the extension zip, and includes `SHA256SUMS`.

Chrome Web Store publishing is still manual from the generated zip.

## Project Governance

- Contributions: [CONTRIBUTING.md](/Users/qingyingliu/Code/cursorful-chrome-extension/CONTRIBUTING.md)
- Security reports: [SECURITY.md](/Users/qingyingliu/Code/cursorful-chrome-extension/SECURITY.md)
- License: [MIT](/Users/qingyingliu/Code/cursorful-chrome-extension/LICENSE)
