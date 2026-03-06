## Cursor Cloud specific instructions

This is a Chrome extension (MV3) called "Cursorful Core Replica" — a screen recorder with auto-zoom, timeline editing, and local video export. It is entirely client-side with zero npm dependencies and no build step.

### Running tests

```
npm test
```

Uses Node's built-in test runner (`node --test`). Test files live in `tests/`.

### Loading the extension in Chrome

Launch Chrome with the unpacked extension:

```
google-chrome --no-first-run --disable-default-apps --no-default-browser-check --load-extension=/workspace/extension/
```

The popup opens the Studio page (`studio.html`), which contains all recording, preview, timeline, background, and export controls.

### Key caveats

- Screen recording via `getDisplayMedia` requires a real display and user gesture; it cannot be fully automated in headless mode.
- There is no linter configured in the project (no ESLint, Prettier, or similar).
- There is no build step — all extension files in `extension/` are vanilla JS/CSS/HTML served as-is.
