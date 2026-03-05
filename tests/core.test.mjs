import test from "node:test";
import assert from "node:assert/strict";

import {
  computeContainRect,
  generateAutoZoomEvents,
  getOutputSize,
  getZoomStateAtTime
} from "../extension/src/core.js";

test("generateAutoZoomEvents creates events from clustered clicks", () => {
  const events = generateAutoZoomEvents({
    clicks: [
      { t: 100, x: 100, y: 200 },
      { t: 500, x: 300, y: 400 },
      { t: 4900, x: 200, y: 200 },
      { t: 5200, x: 220, y: 220 }
    ],
    viewport: { width: 1000, height: 1000 }
  });

  assert.equal(events.length, 4);
  assert.ok(events[0].start >= 0);
  assert.ok(events[0].scale > 1);
});

test("generateAutoZoomEvents ignores sparse clicks", () => {
  const events = generateAutoZoomEvents({
    clicks: [
      { t: 100, x: 100, y: 100 },
      { t: 5000, x: 500, y: 500 }
    ],
    viewport: { width: 1000, height: 1000 }
  });
  assert.equal(events.length, 0);
});

test("getZoomStateAtTime supports fixed and follow-cursor modes", () => {
  const fixed = getZoomStateAtTime(
    1.0,
    [{ id: "a", start: 0.5, end: 1.5, scale: 2, x: 0.2, y: 0.3, followCursor: false }],
    [],
    { width: 1000, height: 1000 }
  );
  assert.ok(fixed);
  assert.ok(fixed.scale > 1);
  assert.equal(Number(fixed.x.toFixed(2)), 0.2);
  assert.equal(Number(fixed.y.toFixed(2)), 0.3);

  const follow = getZoomStateAtTime(
    1.0,
    [{ id: "b", start: 0.5, end: 1.5, scale: 2, x: 0.2, y: 0.3, followCursor: true }],
    [
      { t: 900, x: 400, y: 500 },
      { t: 1000, x: 800, y: 100 }
    ],
    { width: 1000, height: 1000 }
  );
  assert.ok(follow);
  assert.equal(Number(follow.x.toFixed(2)), 0.8);
  assert.equal(Number(follow.y.toFixed(2)), 0.1);
});

test("getOutputSize respects target aspect mode", () => {
  const horizontal = getOutputSize("16:9", 1920, 1080, 1280);
  assert.equal(horizontal.width, 1280);
  assert.equal(horizontal.height, 720);

  const vertical = getOutputSize("9:16", 1920, 1080, 1280);
  assert.equal(vertical.width, 720);
  assert.equal(vertical.height, 1280);
});

test("computeContainRect keeps source inside target", () => {
  const rect = computeContainRect(1920, 1080, 1000, 1000, 40);
  assert.equal(rect.width, 920);
  assert.equal(rect.height, 518);
  assert.ok(rect.x >= 0);
  assert.ok(rect.y >= 0);
});
