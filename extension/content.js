let tracking = false;
let startAt = 0;
let viewport = { width: 1, height: 1 };
let clickPoints = [];
let cursorTrail = [];
let lastMoveAt = 0;

const MOVE_INTERVAL_MS = 33;

function nowSinceStart() {
  return performance.now() - startAt;
}

function onClick(event) {
  if (!tracking) return;
  clickPoints.push({
    t: Math.round(nowSinceStart()),
    x: event.clientX,
    y: event.clientY
  });
}

function onMouseMove(event) {
  if (!tracking) return;
  const now = performance.now();
  if (now - lastMoveAt < MOVE_INTERVAL_MS) return;
  lastMoveAt = now;
  cursorTrail.push({
    t: Math.round(nowSinceStart()),
    x: event.clientX,
    y: event.clientY
  });
}

function startTracking() {
  if (tracking) return;
  tracking = true;
  startAt = performance.now();
  viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  clickPoints = [];
  cursorTrail = [];
  lastMoveAt = 0;
  document.addEventListener("click", onClick, true);
  document.addEventListener("mousemove", onMouseMove, true);
}

function stopTracking() {
  if (!tracking) {
    return {
      clicks: clickPoints,
      cursor: cursorTrail,
      viewport
    };
  }
  tracking = false;
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("mousemove", onMouseMove, true);
  return {
    clicks: clickPoints,
    cursor: cursorTrail,
    viewport
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CURSORFUL_START_TRACKING") {
    startTracking();
    sendResponse({ ok: true, viewport });
    return true;
  }

  if (message?.type === "CURSORFUL_STOP_TRACKING") {
    const data = stopTracking();
    sendResponse({ ok: true, data });
    return true;
  }

  if (message?.type === "CURSORFUL_PING") {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
