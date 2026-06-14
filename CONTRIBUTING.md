# Contributing

Thanks for taking the time to improve Cursorful.

## Development Setup

Cursorful is a vanilla Manifest V3 Chrome extension. It has no runtime npm
dependencies and no build step.

```bash
npm install
npm test
npm run package
```

Load the unpacked extension from the `extension/` directory while developing.

## Pull Requests

Before opening a pull request:

1. Keep changes focused on one feature or fix.
2. Run `npm test`.
3. Run `npm run package` when release packaging could be affected.
4. Update README files when behavior, install steps, or release steps change.

## Release Versioning

The extension version lives in `extension/manifest.json`.

Release tags must match the manifest version:

```bash
git tag v0.3.1
git push origin v0.3.1
```

Pushing a `v*` tag runs the release workflow, creates a GitHub Release, and
uploads the packaged extension zip.
