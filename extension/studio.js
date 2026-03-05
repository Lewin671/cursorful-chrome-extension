import {
  clamp,
  computeContainRect,
  generateAutoZoomEvents,
  getOutputSize,
  getZoomStateAtTime,
  sortZoomEvents
} from "./src/core.js";

const startButton = document.querySelector("#startRecording");
const stopButton = document.querySelector("#stopRecording");
const statusLabel = document.querySelector("#recordingStatus");
const playButton = document.querySelector("#playPreview");
const pauseButton = document.querySelector("#pausePreview");
const seekBar = document.querySelector("#seekBar");
const addZoomButton = document.querySelector("#addZoomEvent");
const timelineList = document.querySelector("#timelineList");
const exportButton = document.querySelector("#exportVideo");
const downloadLink = document.querySelector("#downloadLink");
const sourceVideo = document.querySelector("#sourceVideo");
const previewCanvas = document.querySelector("#previewCanvas");
const aspectSelect = document.querySelector("#aspectRatio");
const frameToggle = document.querySelector("#showBrowserFrame");
const bgColorInput = document.querySelector("#bgColor");
const bgGradientAInput = document.querySelector("#bgGradientA");
const bgGradientBInput = document.querySelector("#bgGradientB");
const bgImageInput = document.querySelector("#bgImage");

const previewCtx = previewCanvas.getContext("2d");

const state = {
  recording: false,
  mediaStream: null,
  mediaRecorder: null,
  chunks: [],
  timerId: null,
  startedAt: 0,
  targetTabId: null,
  interactions: {
    clicks: [],
    cursor: [],
    viewport: { width: 1, height: 1 }
  },
  zoomEvents: [],
  sourceBlob: null,
  sourceUrl: "",
  sourceMeta: {
    width: 1,
    height: 1,
    duration: 0
  },
  background: {
    mode: "none",
    color: "#111827",
    gradientA: "#1d4ed8",
    gradientB: "#9333ea",
    image: null
  },
  rafId: null
};

function setStatus(message) {
  statusLabel.textContent = message;
}

function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
}

function parseTargetTabId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("targetTabId");
  if (!value) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

async function queryFallbackTargetTabId() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidate = tabs.find(
    (tab) =>
      tab.id &&
      tab.url &&
      !tab.url.startsWith("chrome://") &&
      !tab.url.startsWith("chrome-extension://")
  );
  return candidate?.id ?? null;
}

function sendMessageToTab(tabId, message) {
  if (!tabId) return Promise.resolve(null);
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response ?? null);
    });
  });
}

function releaseObjectUrl() {
  if (state.sourceUrl) {
    URL.revokeObjectURL(state.sourceUrl);
    state.sourceUrl = "";
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground(width, height) {
  const mode = state.background.mode;
  if (mode === "none") {
    previewCtx.fillStyle = "#030712";
    previewCtx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "color") {
    previewCtx.fillStyle = state.background.color;
    previewCtx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "gradient") {
    const gradient = previewCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, state.background.gradientA);
    gradient.addColorStop(1, state.background.gradientB);
    previewCtx.fillStyle = gradient;
    previewCtx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "image" && state.background.image) {
    previewCtx.drawImage(state.background.image, 0, 0, width, height);
    return;
  }

  previewCtx.fillStyle = "#020617";
  previewCtx.fillRect(0, 0, width, height);
}

function drawFrameAtTime(videoElement, currentTimeSec) {
  if (!videoElement || !state.sourceMeta.duration) return;

  const aspectMode = aspectSelect.value;
  const previewSize = getOutputSize(aspectMode, state.sourceMeta.width, state.sourceMeta.height, 960);
  if (previewCanvas.width !== previewSize.width || previewCanvas.height !== previewSize.height) {
    previewCanvas.width = previewSize.width;
    previewCanvas.height = previewSize.height;
  }

  const canvasWidth = previewCanvas.width;
  const canvasHeight = previewCanvas.height;
  const showFrame = frameToggle.checked;
  const padding = showFrame ? 24 : 0;
  const containRect = computeContainRect(
    state.sourceMeta.width,
    state.sourceMeta.height,
    canvasWidth,
    canvasHeight,
    padding
  );

  drawBackground(canvasWidth, canvasHeight);

  if (showFrame) {
    previewCtx.save();
    previewCtx.fillStyle = "#f8fafc";
    previewCtx.shadowColor = "rgba(15, 23, 42, 0.45)";
    previewCtx.shadowBlur = 18;
    drawRoundedRect(
      previewCtx,
      containRect.x - 10,
      containRect.y - 10,
      containRect.width + 20,
      containRect.height + 20,
      16
    );
    previewCtx.fill();
    previewCtx.restore();
  }

  const zoom = getZoomStateAtTime(
    currentTimeSec,
    state.zoomEvents,
    state.interactions.cursor,
    state.interactions.viewport
  );

  let sx = 0;
  let sy = 0;
  let sw = state.sourceMeta.width;
  let sh = state.sourceMeta.height;

  if (zoom) {
    sw = state.sourceMeta.width / zoom.scale;
    sh = state.sourceMeta.height / zoom.scale;
    sx = clamp(zoom.x * state.sourceMeta.width - sw / 2, 0, state.sourceMeta.width - sw);
    sy = clamp(zoom.y * state.sourceMeta.height - sh / 2, 0, state.sourceMeta.height - sh);
  }

  previewCtx.drawImage(
    videoElement,
    sx,
    sy,
    sw,
    sh,
    containRect.x,
    containRect.y,
    containRect.width,
    containRect.height
  );
}

function updateButtonsAfterRecordingReady() {
  playButton.disabled = false;
  pauseButton.disabled = false;
  addZoomButton.disabled = false;
  exportButton.disabled = false;
}

function stopPreviewLoop() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function startPreviewLoop() {
  if (state.rafId) return;
  const render = () => {
    if (!sourceVideo.paused && !sourceVideo.ended) {
      seekBar.value = String(sourceVideo.currentTime);
      drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
      state.rafId = requestAnimationFrame(render);
      return;
    }
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
    state.rafId = null;
  };
  state.rafId = requestAnimationFrame(render);
}

function normalizeEvent(event) {
  return {
    ...event,
    start: Math.max(0, Number(event.start ?? 0)),
    end: Math.max(Number(event.start ?? 0) + 0.05, Number(event.end ?? 0.2)),
    scale: clamp(Number(event.scale ?? 1.6), 1.01, 5),
    x: clamp(Number(event.x ?? 0.5), 0, 1),
    y: clamp(Number(event.y ?? 0.5), 0, 1),
    followCursor: Boolean(event.followCursor)
  };
}

function renderTimelineList() {
  timelineList.innerHTML = "";

  if (!state.zoomEvents.length) {
    const empty = document.createElement("div");
    empty.className = "zoom-item";
    empty.textContent = "当前没有缩放片段。";
    timelineList.append(empty);
    return;
  }

  state.zoomEvents.forEach((event, index) => {
    const item = document.createElement("div");
    item.className = "zoom-item";
    item.innerHTML = `
      <div><strong>#${index + 1}</strong> ${event.followCursor ? "（跟随光标）" : "（固定位置）"}</div>
      <div class="grid">
        <label>开始(s)<input data-id="${event.id}" data-field="start" type="number" step="0.01" value="${event.start.toFixed(2)}" /></label>
        <label>结束(s)<input data-id="${event.id}" data-field="end" type="number" step="0.01" value="${event.end.toFixed(2)}" /></label>
        <label>缩放<input data-id="${event.id}" data-field="scale" type="number" step="0.05" min="1" max="5" value="${event.scale.toFixed(2)}" /></label>
        <label>X(0-1)<input data-id="${event.id}" data-field="x" type="number" step="0.01" min="0" max="1" value="${event.x.toFixed(2)}" /></label>
        <label>Y(0-1)<input data-id="${event.id}" data-field="y" type="number" step="0.01" min="0" max="1" value="${event.y.toFixed(2)}" /></label>
        <label>跟随光标<input data-id="${event.id}" data-field="followCursor" type="checkbox" ${event.followCursor ? "checked" : ""} /></label>
      </div>
      <div class="row">
        <button data-id="${event.id}" data-action="jump">跳转到此片段</button>
        <button data-id="${event.id}" data-action="delete">删除</button>
      </div>
    `;
    timelineList.append(item);
  });

  timelineList.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("input", (evt) => {
      const target = evt.currentTarget;
      const id = target.dataset.id;
      const field = target.dataset.field;
      const event = state.zoomEvents.find((item) => item.id === id);
      if (!event) return;

      if (field === "followCursor") {
        event.followCursor = target.checked;
      } else {
        event[field] = Number(target.value);
      }

      state.zoomEvents = sortZoomEvents(state.zoomEvents.map(normalizeEvent));
      drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
    });
  });

  timelineList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", (evt) => {
      const target = evt.currentTarget;
      const id = target.dataset.id;
      const action = target.dataset.action;

      if (action === "delete") {
        state.zoomEvents = state.zoomEvents.filter((event) => event.id !== id);
        renderTimelineList();
        drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
        return;
      }

      if (action === "jump") {
        const event = state.zoomEvents.find((item) => item.id === id);
        if (!event) return;
        sourceVideo.currentTime = event.start;
        seekBar.value = String(event.start);
        drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
      }
    });
  });
}

function attachVideoMetadata(videoElement) {
  return new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = () => resolve();
    videoElement.onerror = () => reject(new Error("视频元数据读取失败"));
  });
}

async function finalizeRecording() {
  const mimeType = state.mediaRecorder?.mimeType || "video/webm";
  state.sourceBlob = new Blob(state.chunks, { type: mimeType });
  state.chunks = [];

  releaseObjectUrl();
  state.sourceUrl = URL.createObjectURL(state.sourceBlob);
  sourceVideo.src = state.sourceUrl;
  sourceVideo.load();
  await attachVideoMetadata(sourceVideo);

  state.sourceMeta = {
    width: sourceVideo.videoWidth || 1,
    height: sourceVideo.videoHeight || 1,
    duration: sourceVideo.duration || 0
  };

  seekBar.min = "0";
  seekBar.max = String(state.sourceMeta.duration.toFixed(2));
  seekBar.value = "0";

  state.zoomEvents = generateAutoZoomEvents(state.interactions).map(normalizeEvent);
  renderTimelineList();
  drawFrameAtTime(sourceVideo, 0);
  updateButtonsAfterRecordingReady();
  setStatus(`录制完成：${state.sourceMeta.duration.toFixed(1)}s，自动缩放片段 ${state.zoomEvents.length} 个`);
}

async function startTrackingOnTargetTab() {
  if (!state.targetTabId) return false;
  const ping = await sendMessageToTab(state.targetTabId, { type: "CURSORFUL_PING" });
  if (!ping?.ok) return false;
  const response = await sendMessageToTab(state.targetTabId, { type: "CURSORFUL_START_TRACKING" });
  return Boolean(response?.ok);
}

async function stopTrackingOnTargetTab() {
  if (!state.targetTabId) return;
  const response = await sendMessageToTab(state.targetTabId, { type: "CURSORFUL_STOP_TRACKING" });
  if (response?.ok && response.data) {
    state.interactions = response.data;
  }
}

async function startRecording() {
  if (state.recording) return;
  setStatus("准备开始录制...");

  state.targetTabId = parseTargetTabId() ?? (await queryFallbackTargetTabId());
  const trackingStarted = await startTrackingOnTargetTab();

  try {
    state.mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true
    });
  } catch (error) {
    setStatus(`录制启动失败：${error.message}`);
    return;
  }

  const mimeType = getSupportedMimeType();
  state.mediaRecorder = mimeType
    ? new MediaRecorder(state.mediaStream, { mimeType })
    : new MediaRecorder(state.mediaStream);

  state.chunks = [];
  state.interactions = {
    clicks: [],
    cursor: [],
    viewport: { width: 1, height: 1 }
  };

  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) state.chunks.push(event.data);
  };

  state.mediaRecorder.onstop = async () => {
    await finalizeRecording();
  };

  state.mediaRecorder.start(200);
  state.startedAt = Date.now();
  state.recording = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  setStatus(trackingStarted ? "录制中（点击轨迹跟踪中）" : "录制中（未捕获目标页面点击轨迹）");

  state.timerId = setInterval(() => {
    const elapsed = ((Date.now() - state.startedAt) / 1000).toFixed(1);
    setStatus(`录制中 ${elapsed}s`);
  }, 200);

  const [videoTrack] = state.mediaStream.getVideoTracks();
  if (videoTrack) {
    videoTrack.addEventListener("ended", () => {
      if (state.recording) stopRecording();
    });
  }
}

async function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  setStatus("停止录制，正在处理...");
  startButton.disabled = false;
  stopButton.disabled = true;
  clearInterval(state.timerId);
  state.timerId = null;

  await stopTrackingOnTargetTab();

  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }

  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
  }
}

async function exportVideo() {
  if (!state.sourceUrl || !state.sourceMeta.duration) return;
  exportButton.disabled = true;
  setStatus("本地离线导出中...");

  const mode = aspectSelect.value;
  const output = getOutputSize(mode, state.sourceMeta.width, state.sourceMeta.height, 1280);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext("2d");

  const tempVideo = document.createElement("video");
  tempVideo.src = state.sourceUrl;
  tempVideo.muted = true;
  tempVideo.playsInline = true;
  tempVideo.crossOrigin = "anonymous";
  await attachVideoMetadata(tempVideo);

  const mimeType = getSupportedMimeType();
  const stream = canvas.captureStream(30);
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };
  });

  recorder.start(200);
  await tempVideo.play();

  await new Promise((resolve) => {
    const tick = () => {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const showFrame = frameToggle.checked;
      const padding = showFrame ? 24 : 0;

      if (state.background.mode === "none") {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (state.background.mode === "color") {
        ctx.fillStyle = state.background.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (state.background.mode === "gradient") {
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, state.background.gradientA);
        gradient.addColorStop(1, state.background.gradientB);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (state.background.mode === "image" && state.background.image) {
        ctx.drawImage(state.background.image, 0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      const contain = computeContainRect(
        state.sourceMeta.width,
        state.sourceMeta.height,
        canvasWidth,
        canvasHeight,
        padding
      );

      if (showFrame) {
        ctx.save();
        ctx.fillStyle = "#f8fafc";
        ctx.shadowColor = "rgba(15, 23, 42, 0.45)";
        ctx.shadowBlur = 18;
        drawRoundedRect(ctx, contain.x - 10, contain.y - 10, contain.width + 20, contain.height + 20, 16);
        ctx.fill();
        ctx.restore();
      }

      const zoom = getZoomStateAtTime(
        tempVideo.currentTime,
        state.zoomEvents,
        state.interactions.cursor,
        state.interactions.viewport
      );

      let sx = 0;
      let sy = 0;
      let sw = state.sourceMeta.width;
      let sh = state.sourceMeta.height;

      if (zoom) {
        sw = state.sourceMeta.width / zoom.scale;
        sh = state.sourceMeta.height / zoom.scale;
        sx = clamp(zoom.x * state.sourceMeta.width - sw / 2, 0, state.sourceMeta.width - sw);
        sy = clamp(zoom.y * state.sourceMeta.height - sh / 2, 0, state.sourceMeta.height - sh);
      }

      ctx.drawImage(tempVideo, sx, sy, sw, sh, contain.x, contain.y, contain.width, contain.height);

      if (!tempVideo.ended) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    tick();
  });

  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  const exportedBlob = await done;

  const previousHref = downloadLink.getAttribute("href");
  if (previousHref?.startsWith("blob:")) {
    URL.revokeObjectURL(previousHref);
  }

  downloadLink.href = URL.createObjectURL(exportedBlob);
  downloadLink.classList.remove("hidden");
  downloadLink.textContent = `下载导出结果（${(exportedBlob.size / 1024 / 1024).toFixed(1)} MB）`;
  setStatus("本地离线导出完成");
  exportButton.disabled = false;
}

function wireUiEvents() {
  startButton.addEventListener("click", startRecording);
  stopButton.addEventListener("click", stopRecording);

  playButton.addEventListener("click", async () => {
    if (!state.sourceUrl) return;
    await sourceVideo.play();
    startPreviewLoop();
  });

  pauseButton.addEventListener("click", () => {
    sourceVideo.pause();
    stopPreviewLoop();
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  seekBar.addEventListener("input", () => {
    if (!state.sourceUrl) return;
    const time = Number(seekBar.value);
    sourceVideo.currentTime = time;
    drawFrameAtTime(sourceVideo, time);
  });

  sourceVideo.addEventListener("ended", () => {
    stopPreviewLoop();
  });

  sourceVideo.addEventListener("pause", () => {
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  aspectSelect.addEventListener("change", () => drawFrameAtTime(sourceVideo, sourceVideo.currentTime));
  frameToggle.addEventListener("change", () => drawFrameAtTime(sourceVideo, sourceVideo.currentTime));

  addZoomButton.addEventListener("click", () => {
    const anchor = sourceVideo.currentTime || 0;
    state.zoomEvents = sortZoomEvents([
      ...state.zoomEvents,
      normalizeEvent({
        id: crypto.randomUUID(),
        start: Math.max(0, anchor - 0.1),
        end: anchor + 1,
        scale: 1.8,
        x: 0.5,
        y: 0.5,
        followCursor: false
      })
    ]);
    renderTimelineList();
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  exportButton.addEventListener("click", exportVideo);

  document.querySelectorAll("input[name='backgroundMode']").forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.background.mode = event.target.value;
      drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
    });
  });

  bgColorInput.addEventListener("input", () => {
    state.background.color = bgColorInput.value;
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  bgGradientAInput.addEventListener("input", () => {
    state.background.gradientA = bgGradientAInput.value;
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  bgGradientBInput.addEventListener("input", () => {
    state.background.gradientB = bgGradientBInput.value;
    drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
  });

  bgImageInput.addEventListener("change", () => {
    const [file] = bgImageInput.files ?? [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.background.image = image;
        state.background.mode = "image";
        const imageRadio = document.querySelector("input[name='backgroundMode'][value='image']");
        if (imageRadio) imageRadio.checked = true;
        drawFrameAtTime(sourceVideo, sourceVideo.currentTime);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function init() {
  setStatus("就绪：点击“开始录制”");
  wireUiEvents();
}

window.addEventListener("beforeunload", () => {
  stopPreviewLoop();
  releaseObjectUrl();
});

init();
