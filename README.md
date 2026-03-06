# Cursorful Core Replica

Chrome Extension (Manifest V3) screen recorder with auto-zoom, timeline editing, and local video export.

## Development

- Run tests:

  `npm test`

- Package extension for release:

  `npm run package`

The packaging script reads `extension/manifest.json` and generates a zip under `dist/`, for example:

`dist/cursorful-core-replica-v0.1.0.zip`

## Publish to Chrome Web Store

### 1) Prepare release

1. Update `version` in `extension/manifest.json` (must be higher than last published version).
2. Run tests:
   - `npm test`
3. Build release zip:
   - `npm run package`
4. Verify zip structure (optional but recommended):
   - `unzip -l dist/*.zip`
   - Ensure `manifest.json` is at the root of the zip.

### 2) Upload in Developer Dashboard

1. Open Chrome Web Store Developer Dashboard.
2. Enter your extension item.
3. Go to **Package** / **Upload new package**.
4. Upload the zip file generated in `dist/`.

### 3) Complete store listing checks

Before submitting review, confirm:

- Extension description and screenshots are up to date.
- Privacy policy URL is valid (if required by permissions/features).
- Data usage declarations are accurate.
- Host permissions and optional permissions match actual behavior.

### 4) Submit for review

1. Save draft changes.
2. Submit for review in the Developer Dashboard.
3. Wait for review result and publish once approved.

## Release checklist (quick copy)

- [ ] Bump `extension/manifest.json` version
- [ ] `npm test` passed
- [ ] `npm run package` generated zip in `dist/`
- [ ] Upload zip to Chrome Web Store Developer Dashboard
- [ ] Verify store listing assets and policy info
- [ ] Submit review
