const DEFAULT_WINDOW_MS = 3000;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function easeInOut(t) {
  const p = clamp(t, 0, 1);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export function sortZoomEvents(events) {
  return [...events].sort((a, b) => a.start - b.start);
}

export function getAspectRatio(mode, sourceWidth, sourceHeight) {
  if (mode === "16:9") return 16 / 9;
  if (mode === "9:16") return 9 / 16;
  if (mode === "1:1") return 1;
  return sourceWidth / sourceHeight;
}

export function getOutputSize(mode, sourceWidth, sourceHeight, maxLongEdge = 1280) {
  const ratio = getAspectRatio(mode, sourceWidth, sourceHeight);
  let width;
  let height;

  if (ratio >= 1) {
    width = maxLongEdge;
    height = Math.round(width / ratio);
  } else {
    height = maxLongEdge;
    width = Math.round(height * ratio);
  }

  if (height > maxLongEdge) {
    height = maxLongEdge;
    width = Math.round(height * ratio);
  }

  return { width, height, ratio };
}

export function computeContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight, padding = 0) {
  const availableWidth = Math.max(1, targetWidth - padding * 2);
  const availableHeight = Math.max(1, targetHeight - padding * 2);
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = availableWidth / availableHeight;

  let drawWidth;
  let drawHeight;

  if (sourceRatio > targetRatio) {
    drawWidth = availableWidth;
    drawHeight = Math.round(drawWidth / sourceRatio);
  } else {
    drawHeight = availableHeight;
    drawWidth = Math.round(drawHeight * sourceRatio);
  }

  const x = Math.round((targetWidth - drawWidth) / 2);
  const y = Math.round((targetHeight - drawHeight) / 2);
  return { x, y, width: drawWidth, height: drawHeight };
}

export function generateAutoZoomEvents(interactions, options = {}) {
  const clicks = [...(interactions?.clicks ?? [])]
    .filter((item) => Number.isFinite(item.t))
    .sort((a, b) => a.t - b.t);
  const viewport = interactions?.viewport ?? { width: 1, height: 1 };
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  if (clicks.length < 2) return [];

  const clusters = [];
  let currentCluster = [clicks[0]];

  for (let i = 1; i < clicks.length; i += 1) {
    const prev = clicks[i - 1];
    const cur = clicks[i];
    if (cur.t - prev.t <= windowMs) {
      currentCluster.push(cur);
    } else {
      clusters.push(currentCluster);
      currentCluster = [cur];
    }
  }
  clusters.push(currentCluster);

  const events = [];
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    for (const click of cluster) {
      events.push({
        id: crypto.randomUUID(),
        start: Math.max(0, click.t / 1000 - 0.15),
        end: click.t / 1000 + 1.1,
        scale: 1.8,
        x: clamp(click.x / Math.max(1, viewport.width), 0, 1),
        y: clamp(click.y / Math.max(1, viewport.height), 0, 1),
        followCursor: false
      });
    }
  }

  return sortZoomEvents(events);
}

function findCursorPointAtTime(cursorTrail, timeMs) {
  if (!cursorTrail?.length) return null;

  let low = 0;
  let high = cursorTrail.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = cursorTrail[mid].t;
    if (value === timeMs) return cursorTrail[mid];
    if (value < timeMs) low = mid + 1;
    else high = mid - 1;
  }

  const left = cursorTrail[Math.max(0, high)];
  const right = cursorTrail[Math.min(cursorTrail.length - 1, low)];

  if (!left) return right ?? null;
  if (!right) return left ?? null;
  return Math.abs(left.t - timeMs) <= Math.abs(right.t - timeMs) ? left : right;
}

export function getZoomStateAtTime(timeSec, zoomEvents, cursorTrail, viewport = { width: 1, height: 1 }) {
  const events = sortZoomEvents(zoomEvents ?? []);
  const active = events.find((event) => timeSec >= event.start && timeSec <= event.end);
  if (!active) return null;

  const ramp = Math.min(0.2, (active.end - active.start) / 3);
  const inT = clamp((timeSec - active.start) / Math.max(0.001, ramp), 0, 1);
  const outT = clamp((active.end - timeSec) / Math.max(0.001, ramp), 0, 1);
  const progress = Math.min(easeInOut(inT), easeInOut(outT));
  const scale = lerp(1, Math.max(1.01, active.scale), progress);

  let x = clamp(active.x, 0, 1);
  let y = clamp(active.y, 0, 1);

  if (active.followCursor) {
    const point = findCursorPointAtTime(cursorTrail, timeSec * 1000);
    if (point) {
      x = clamp(point.x / Math.max(1, viewport.width), 0, 1);
      y = clamp(point.y / Math.max(1, viewport.height), 0, 1);
    }
  }

  return { scale, x, y, eventId: active.id };
}
