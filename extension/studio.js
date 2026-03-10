// ── DOM refs ─────────────────────────────────────────────────────────────────
const startBtn = document.querySelector('#startRecording');
const stopBtn = document.querySelector('#stopRecording');
const statusBadge = document.querySelector('#recordingStatus');
const emptyState = document.querySelector('#emptyState');
const recordingState = document.querySelector('#recordingState');
const previewState = document.querySelector('#previewState');
const recTimer = document.querySelector('#recTimer');
const previewVideo = document.querySelector('#previewVideo');
const previewMeta = document.querySelector('#previewMeta');
const downloadBtn = document.querySelector('#downloadBtn');
const reRecordBtn = document.querySelector('#reRecordBtn');

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  recording: false,
  mediaStream: null,
  mediaRecorder: null,
  chunks: [],
  timerInterval: null,
  startedAt: 0,
  targetTabId: null,
  sourceBlob: null,
  sourceBlobUrl: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(text, variant = 'idle') {
  statusBadge.textContent = text;
  statusBadge.className = `status-badge status-${variant}`;
}

function showSection(section) {
  [emptyState, recordingState, previewState].forEach(el => el.classList.add('hidden'));
  section.classList.remove('hidden');
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

function releaseSourceUrl() {
  if (state.sourceBlobUrl) {
    URL.revokeObjectURL(state.sourceBlobUrl);
    state.sourceBlobUrl = '';
  }
}

// ── Tab tracking helpers ───────────────────────────────────────────────────────

function parseTargetTabId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('targetTabId');
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

async function queryFallbackTargetTabId() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidate = tabs.find(
    tab => tab.id &&
      tab.url &&
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://')
  );
  return candidate?.id ?? null;
}

function sendMessageToTab(tabId, message) {
  if (!tabId) return Promise.resolve(null);
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(response ?? null);
    });
  });
}

async function startTrackingOnTargetTab() {
  if (!state.targetTabId) return false;
  const ping = await sendMessageToTab(state.targetTabId, { type: 'CURSORFUL_PING' });
  if (!ping?.ok) return false;
  const res = await sendMessageToTab(state.targetTabId, { type: 'CURSORFUL_START_TRACKING' });
  return Boolean(res?.ok);
}

async function stopTrackingOnTargetTab() {
  if (!state.targetTabId) return;
  await sendMessageToTab(state.targetTabId, { type: 'CURSORFUL_STOP_TRACKING' });
}

// ── Core recording logic ───────────────────────────────────────────────────────

async function startRecording() {
  if (state.recording) return;

  state.targetTabId = parseTargetTabId() ?? (await queryFallbackTargetTabId());
  await startTrackingOnTargetTab();

  // Request display capture
  try {
    const dpr = window.devicePixelRatio || 1;
    const physW = Math.round(window.screen.width * dpr);
    const physH = Math.round(window.screen.height * dpr);

    state.mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 60,
        width: { ideal: physW, max: physW },
        height: { ideal: physH, max: physH },
        resizeMode: 'none',
      },
      audio: true,
    });
  } catch (err) {
    setStatus('启动失败', 'idle');
    console.error('getDisplayMedia error:', err);
    return;
  }

  // Set up MediaRecorder
  const mimeType = getSupportedMimeType();
  state.mediaRecorder = mimeType
    ? new MediaRecorder(state.mediaStream, { mimeType })
    : new MediaRecorder(state.mediaStream);

  state.chunks = [];
  state.mediaRecorder.ondataavailable = evt => {
    if (evt.data.size > 0) state.chunks.push(evt.data);
  };
  state.mediaRecorder.onstop = finalizeRecording;
  state.mediaRecorder.start(200);

  // Update UI
  state.recording = true;
  state.startedAt = Date.now();
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus('录制中', 'recording');
  showSection(recordingState);

  // Timer
  state.timerInterval = setInterval(() => {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    recTimer.textContent = formatTime(elapsed);
  }, 500);

  // Auto-stop if user closes screen share
  const [videoTrack] = state.mediaStream.getVideoTracks();
  if (videoTrack) {
    videoTrack.addEventListener('ended', () => {
      if (state.recording) stopRecording();
    });
  }
}

async function stopRecording() {
  if (!state.recording) return;

  state.recording = false;
  clearInterval(state.timerInterval);
  state.timerInterval = null;

  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('处理中...', 'idle');

  await stopTrackingOnTargetTab();

  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(t => t.stop());
    state.mediaStream = null;
  }
}

function finalizeRecording() {
  const mimeType = state.mediaRecorder?.mimeType || 'video/webm';
  state.sourceBlob = new Blob(state.chunks, { type: mimeType });
  state.chunks = [];

  releaseSourceUrl();
  state.sourceBlobUrl = URL.createObjectURL(state.sourceBlob);

  // Show preview
  previewVideo.src = state.sourceBlobUrl;
  previewVideo.load();

  const sizeMB = (state.sourceBlob.size / 1024 / 1024).toFixed(1);
  previewMeta.textContent = `${sizeMB} MB`;

  previewVideo.onloadedmetadata = () => {
    const dur = previewVideo.duration;
    if (Number.isFinite(dur) && dur > 0) {
      previewMeta.textContent = `${formatTime(dur)} · ${sizeMB} MB`;
    }
  };

  setStatus('录制完成', 'done');
  showSection(previewState);
  downloadBtn.disabled = false;
}

function downloadRecording() {
  if (!state.sourceBlob) return;

  const ext = state.sourceBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `cursorful-${timestamp}.${ext}`;

  const a = document.createElement('a');
  a.href = state.sourceBlobUrl;
  a.download = filename;
  a.click();
}

function resetToIdle() {
  releaseSourceUrl();
  state.sourceBlob = null;
  previewVideo.src = '';
  previewMeta.textContent = '';
  recTimer.textContent = '00:00';
  downloadBtn.disabled = true;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('就绪', 'idle');
  showSection(emptyState);
}

// ── Wire up events ─────────────────────────────────────────────────────────────

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
downloadBtn.addEventListener('click', downloadRecording);
reRecordBtn.addEventListener('click', resetToIdle);

window.addEventListener('beforeunload', releaseSourceUrl);

// ── Init ──────────────────────────────────────────────────────────────────────

setStatus('就绪', 'idle');
showSection(emptyState);
