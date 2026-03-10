// ── DOM refs ─────────────────────────────────────────────────────────────────
const stateIdle = document.querySelector('#stateIdle');
const stateRecording = document.querySelector('#stateRecording');
const statePaused = document.querySelector('#statePaused');
const stateDone = document.querySelector('#stateDone');

const recTimeEl = document.querySelector('#recTime');
const pauseTimeEl = document.querySelector('#pauseTime');
const recHintEl = document.querySelector('#recHint');
const previewVideo = document.querySelector('#previewVideo');
const doneMeta = document.querySelector('#doneMeta');

const btnStart = document.querySelector('#btnStart');
const btnPause = document.querySelector('#btnPause');
const btnStop = document.querySelector('#btnStop');
const btnResume = document.querySelector('#btnResume');
const btnStopFromPause = document.querySelector('#btnStopFromPause');
const btnDownload = document.querySelector('#btnDownload');
const btnReRecord = document.querySelector('#btnReRecord');
const btnExpand = document.querySelector('#btnExpand');

// Dots in each view's top bar (for live state color)
const dotIdle = stateIdle?.querySelector('.logo-dot');
const dotRecording = stateRecording?.querySelector('.logo-dot');
const dotPaused = statePaused?.querySelector('.logo-dot');
const dotDone = stateDone?.querySelector('.logo-dot');

// ── State machine ─────────────────────────────────────────────────────────────
// 'idle' | 'recording' | 'paused' | 'done'
let appState = 'idle';

const rec = {
    mediaStream: null,
    mediaRecorder: null,
    chunks: [],
    startedAt: 0,    // wall-clock ms when recording began
    pausedAt: 0,    // wall-clock ms when pause started
    pausedTotal: 0,    // cumulative ms paused
    interval: null,
    targetTabId: null,
    sourceBlob: null,
    sourceBlobUrl: '',
};

// ── UI helpers ────────────────────────────────────────────────────────────────

function showState(name) {
    appState = name;
    stateIdle.classList.toggle('hidden', name !== 'idle');
    stateRecording.classList.toggle('hidden', name !== 'recording');
    statePaused.classList.toggle('hidden', name !== 'paused');
    stateDone.classList.toggle('hidden', name !== 'done');
}

function pad2(n) { return String(Math.floor(n)).padStart(2, '0'); }

function formatTime(totalMs) {
    const s = totalMs / 1000;
    return `${pad2(s / 60)}:${pad2(s % 60)}`;
}

function elapsedMs() {
    return Date.now() - rec.startedAt - rec.pausedTotal;
}

function startTick() {
    clearInterval(rec.interval);
    rec.interval = setInterval(() => {
        const t = formatTime(elapsedMs());
        recTimeEl.textContent = t;
    }, 200);
}

function stopTick() {
    clearInterval(rec.interval);
    rec.interval = null;
}

// ── Tab tracking ──────────────────────────────────────────────────────────────

async function getTargetTabId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs.find(t =>
        t.id && t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://')
    );
    return tab?.id ?? null;
}

function sendMsg(tabId, message) {
    if (!tabId) return Promise.resolve(null);
    return new Promise(resolve => {
        chrome.tabs.sendMessage(tabId, message, res => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            resolve(res ?? null);
        });
    });
}

async function startTracking() {
    if (!rec.targetTabId) return;
    const ping = await sendMsg(rec.targetTabId, { type: 'CURSORFUL_PING' });
    if (!ping?.ok) return;
    await sendMsg(rec.targetTabId, { type: 'CURSORFUL_START_TRACKING' });
}

async function stopTracking() {
    if (!rec.targetTabId) return;
    await sendMsg(rec.targetTabId, { type: 'CURSORFUL_STOP_TRACKING' });
}

// ── Recording  ────────────────────────────────────────────────────────────────

function getMimeType() {
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

function freeUrl() {
    if (rec.sourceBlobUrl) {
        URL.revokeObjectURL(rec.sourceBlobUrl);
        rec.sourceBlobUrl = '';
    }
}

async function startRecording() {
    rec.targetTabId = await getTargetTabId();
    await startTracking();

    try {
        const dpr = window.devicePixelRatio || 1;
        const pw = Math.round(window.screen.width * dpr);
        const ph = Math.round(window.screen.height * dpr);
        rec.mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 60, width: { ideal: pw, max: pw }, height: { ideal: ph, max: ph }, resizeMode: 'none' },
            audio: true,
        });
    } catch {
        showState('idle');
        return;
    }

    const mime = getMimeType();
    rec.mediaRecorder = mime
        ? new MediaRecorder(rec.mediaStream, { mimeType: mime })
        : new MediaRecorder(rec.mediaStream);

    rec.chunks = [];
    rec.pausedTotal = 0;
    rec.startedAt = Date.now();

    rec.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) rec.chunks.push(e.data); };
    rec.mediaRecorder.onstop = finalize;
    rec.mediaRecorder.start(200);

    // Auto-stop if user closes native share UI
    const [vt] = rec.mediaStream.getVideoTracks();
    vt?.addEventListener('ended', () => {
        if (appState === 'recording' || appState === 'paused') stopRecording();
    });

    showState('recording');
    startTick();
}

function pauseRecording() {
    if (appState !== 'recording') return;
    rec.mediaRecorder?.pause();
    rec.pausedAt = Date.now();
    stopTick();
    pauseTimeEl.textContent = recTimeEl.textContent;
    showState('paused');
}

function resumeRecording() {
    if (appState !== 'paused') return;
    rec.pausedTotal += Date.now() - rec.pausedAt;
    rec.mediaRecorder?.resume();
    showState('recording');
    startTick();
}

async function stopRecording() {
    if (appState !== 'recording' && appState !== 'paused') return;
    stopTick();

    // Bug fix 1: accumulate the final paused duration before stopping,
    // so the recorded metadata stays consistent.
    if (appState === 'paused' && rec.pausedAt > 0) {
        rec.pausedTotal += Date.now() - rec.pausedAt;
        rec.pausedAt = 0;
    }

    await stopTracking();

    if (rec.mediaRecorder) {
        // Bug fix 2: Chrome's MediaRecorder will NOT reliably fire `onstop`
        // when stopped from the 'paused' state. Resume first, then stop.
        if (rec.mediaRecorder.state === 'paused') {
            rec.mediaRecorder.resume();
        }
        if (rec.mediaRecorder.state !== 'inactive') {
            rec.mediaRecorder.stop();
        }
    }

    rec.mediaStream?.getTracks().forEach(t => t.stop());
    rec.mediaStream = null;
}

function finalize() {
    const mime = rec.mediaRecorder?.mimeType || 'video/webm';
    rec.sourceBlob = new Blob(rec.chunks, { type: mime });
    rec.chunks = [];
    freeUrl();
    rec.sourceBlobUrl = URL.createObjectURL(rec.sourceBlob);

    previewVideo.src = rec.sourceBlobUrl;
    previewVideo.load();

    const mb = (rec.sourceBlob.size / 1024 / 1024).toFixed(1);
    doneMeta.textContent = `${mb} MB`;
    previewVideo.onloadedmetadata = () => {
        const d = previewVideo.duration;
        if (Number.isFinite(d) && d > 0) {
            doneMeta.textContent = `${formatTime(d * 1000)} · ${mb} MB`;
        }
    };

    showState('done');
}

function download() {
    if (!rec.sourceBlob) return;
    const ext = rec.sourceBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = Object.assign(document.createElement('a'), {
        href: rec.sourceBlobUrl, download: `cursorful-${ts}.${ext}`
    });
    a.click();
}

function reset() {
    freeUrl();
    rec.sourceBlob = null;
    previewVideo.src = '';
    doneMeta.textContent = '—';
    recTimeEl.textContent = '00:00';
    pauseTimeEl.textContent = '00:00';
    showState('idle');
}

// ── Events ────────────────────────────────────────────────────────────────────

btnStart.addEventListener('click', startRecording);
btnPause.addEventListener('click', pauseRecording);
btnStop.addEventListener('click', stopRecording);
btnResume.addEventListener('click', resumeRecording);
btnStopFromPause.addEventListener('click', stopRecording);
btnDownload.addEventListener('click', download);
btnReRecord.addEventListener('click', reset);
btnExpand.addEventListener('click', () => {
    if (rec.sourceBlobUrl) {
        chrome.tabs.create({ url: rec.sourceBlobUrl });
    }
});
window.addEventListener('beforeunload', freeUrl);

// ── Boot ──────────────────────────────────────────────────────────────────────
showState('idle');
