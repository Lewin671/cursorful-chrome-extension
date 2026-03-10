import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifestPath = new URL("../extension/manifest.json", import.meta.url);
const sidepanelJsPath = new URL("../extension/sidepanel.js", import.meta.url);
const sidepanelHtmlPath = new URL("../extension/sidepanel.html", import.meta.url);

test("manifest includes MV3 and side panel wiring", async () => {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.side_panel?.default_path);
  assert.ok(Array.isArray(manifest.content_scripts));
  assert.ok(manifest.content_scripts.length > 0);
});

test("sidepanel implements core recording logic", async () => {
  const source = await readFile(sidepanelJsPath, "utf8");

  assert.match(source, /getDisplayMedia/);
  assert.match(source, /new MediaRecorder/);
  assert.match(source, /chrome\.tabs\.sendMessage/);
});

test("sidepanel UI contains simple 3-step workflow controls", async () => {
  const html = await readFile(sidepanelHtmlPath, "utf8");

  assert.match(html, /id="btnStart"/);
  assert.match(html, /id="btnStop"/);
  assert.match(html, /id="btnDownload"/);
  assert.match(html, /id="previewVideo"/);
});

