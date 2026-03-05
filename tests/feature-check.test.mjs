import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifestPath = new URL("../extension/manifest.json", import.meta.url);
const studioPath = new URL("../extension/studio.js", import.meta.url);
const htmlPath = new URL("../extension/studio.html", import.meta.url);

test("manifest includes MV3 and content script wiring", async () => {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.action?.default_popup);
  assert.ok(Array.isArray(manifest.content_scripts));
  assert.ok(manifest.content_scripts.length > 0);
});

test("studio implements local recording and export pipeline", async () => {
  const studioSource = await readFile(studioPath, "utf8");

  assert.match(studioSource, /getDisplayMedia/);
  assert.match(studioSource, /new MediaRecorder/);
  assert.match(studioSource, /generateAutoZoomEvents/);
  assert.match(studioSource, /canvas\.captureStream/);
});

test("studio page contains timeline/background/aspect/export controls", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="timelineList"/);
  assert.match(html, /name="backgroundMode"/);
  assert.match(html, /id="aspectRatio"/);
  assert.match(html, /id="exportVideo"/);
});
