import { createRecorderController } from './src/recorder-controller.js';

const startBtn = document.querySelector('#startRecording');
const pauseBtn = document.querySelector('#pauseRecording');
const resumeBtn = document.querySelector('#resumeRecording');
const stopBtn = document.querySelector('#stopRecording');
const statusBadge = document.querySelector('#recordingStatus');
const statusBanner = document.querySelector('#statusBanner');
const emptyState = document.querySelector('#emptyState');
const recordingState = document.querySelector('#recordingState');
const pausedState = document.querySelector('#pausedState');
const processingState = document.querySelector('#processingState');
const previewState = document.querySelector('#previewState');
const recTimer = document.querySelector('#recTimer');
const pauseTimer = document.querySelector('#pauseTimer');
const recHint = document.querySelector('#recHint');
const previewVideo = document.querySelector('#previewVideo');
const previewMeta = document.querySelector('#previewMeta');
const downloadBtn = document.querySelector('#downloadBtn');
const reRecordBtn = document.querySelector('#reRecordBtn');

function setStatus(text, variant = 'idle') {
  statusBadge.textContent = text;
  statusBadge.className = `status-badge status-${variant}`;
}

function showSection(section) {
  [emptyState, recordingState, pausedState, processingState, previewState].forEach(el => {
    el.classList.add('hidden');
  });
  section.classList.remove('hidden');
}

function formatTime(totalMs) {
  const totalSec = Math.floor(totalMs / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function setBanner(type, message) {
  if (!message) {
    statusBanner.textContent = '';
    statusBanner.className = 'status-banner hidden';
    return;
  }
  statusBanner.textContent = message;
  statusBanner.className = `status-banner status-banner-${type}`;
}

function setTopbarButtons(phase) {
  const isIdle = phase === 'idle' || phase === 'done';
  const isRecording = phase === 'recording';
  const isPaused = phase === 'paused';
  const isBusy = phase === 'starting' || phase === 'processing';

  startBtn.disabled = !isIdle;
  pauseBtn.disabled = !isRecording;
  resumeBtn.disabled = !isPaused;
  stopBtn.disabled = !(isRecording || isPaused);

  pauseBtn.classList.toggle('hidden', !isRecording);
  resumeBtn.classList.toggle('hidden', !isPaused);

  if (isBusy) {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

async function resolveTargetTab() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('targetTabId');
  if (value) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      const tab = await chrome.tabs.get(parsed).catch(() => null);
      return tab ? { id: tab.id, url: tab.url ?? '' } : { id: parsed, url: '' };
    }
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidate = tabs.find(tab =>
    tab.id &&
    tab.url &&
    !tab.url.startsWith('chrome-extension://')
  );
  return candidate ? { id: candidate.id, url: candidate.url ?? '' } : null;
}

const controller = createRecorderController({
  resolveTargetTab,
  onPhaseChange({ phase, session, captureSurfaceLabel, error }) {
    setTopbarButtons(phase);

    if (error) {
      setBanner('error', error);
    }

    if (phase === 'idle') {
      recTimer.textContent = '00:00';
      pauseTimer.textContent = '00:00';
      previewVideo.src = '';
      previewMeta.textContent = '';
      downloadBtn.disabled = true;
      setStatus('就绪', 'idle');
      showSection(emptyState);
      return;
    }

    if (phase === 'starting') {
      setStatus('准备中', 'idle');
      showSection(processingState);
      return;
    }

    if (phase === 'recording') {
      setStatus('录制中', 'recording');
      recHint.textContent = captureSurfaceLabel
        ? `正在录制${captureSurfaceLabel}，点击“停止录制”完成。`
        : '录制进行中，点击“停止录制”完成。';
      showSection(recordingState);
      return;
    }

    if (phase === 'paused') {
      setStatus('已暂停', 'paused');
      pauseTimer.textContent = recTimer.textContent;
      showSection(pausedState);
      return;
    }

    if (phase === 'processing') {
      setStatus('处理中', 'idle');
      showSection(processingState);
      return;
    }

    if (phase === 'done' && session) {
      previewVideo.src = session.blobUrl;
      previewVideo.load();
      previewMeta.textContent = session.summary;
      downloadBtn.disabled = false;
      setStatus('录制完成', 'done');
      showSection(previewState);
    }
  },
  onTimer({ elapsedMs, phase }) {
    const value = formatTime(elapsedMs);
    if (phase === 'paused') {
      pauseTimer.textContent = value;
      return;
    }
    recTimer.textContent = value;
  },
  onNotice({ type, message }) {
    setBanner(type, message);
  },
});

startBtn.addEventListener('click', () => {
  setBanner('', '');
  void controller.start();
});
pauseBtn.addEventListener('click', () => controller.pause());
resumeBtn.addEventListener('click', () => controller.resume());
stopBtn.addEventListener('click', () => void controller.stop());
downloadBtn.addEventListener('click', () => controller.download());
reRecordBtn.addEventListener('click', () => {
  setBanner('', '');
  controller.reset();
});

window.addEventListener('beforeunload', () => controller.destroy());

setStatus('就绪', 'idle');
setTopbarButtons('idle');
showSection(emptyState);
