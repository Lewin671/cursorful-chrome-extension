import { createRecorderController } from './src/recorder-controller.js';

const stateIdle = document.querySelector('#stateIdle');
const stateRecording = document.querySelector('#stateRecording');
const statePaused = document.querySelector('#statePaused');
const stateProcessing = document.querySelector('#stateProcessing');
const stateDone = document.querySelector('#stateDone');

const recTimeEl = document.querySelector('#recTime');
const pauseTimeEl = document.querySelector('#pauseTime');
const recHintEl = document.querySelector('#recHint');
const previewVideo = document.querySelector('#previewVideo');
const doneMeta = document.querySelector('#doneMeta');
const statusBanner = document.querySelector('#statusBanner');

const btnStart = document.querySelector('#btnStart');
const btnPause = document.querySelector('#btnPause');
const btnStop = document.querySelector('#btnStop');
const btnResume = document.querySelector('#btnResume');
const btnStopFromPause = document.querySelector('#btnStopFromPause');
const btnDownload = document.querySelector('#btnDownload');
const btnReRecord = document.querySelector('#btnReRecord');
const btnExpand = document.querySelector('#btnExpand');

function showState(name) {
  stateIdle.classList.toggle('hidden', name !== 'idle');
  stateRecording.classList.toggle('hidden', name !== 'recording');
  statePaused.classList.toggle('hidden', name !== 'paused');
  stateProcessing.classList.toggle('hidden', name !== 'processing');
  stateDone.classList.toggle('hidden', name !== 'done');
}

function pad2(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatTime(totalMs) {
  const totalSec = Math.floor(totalMs / 1000);
  return `${pad2(totalSec / 60)}:${pad2(totalSec % 60)}`;
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

async function resolveTargetTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs.find(item =>
    item.id &&
    item.url &&
    !item.url.startsWith('chrome-extension://')
  );
  return tab ? { id: tab.id, url: tab.url ?? '' } : null;
}

const controller = createRecorderController({
  resolveTargetTab,
  onPhaseChange({ phase, session, captureSurfaceLabel, error }) {
    if (error) {
      setBanner('error', error);
    }

    if (phase === 'idle') {
      recTimeEl.textContent = '00:00';
      pauseTimeEl.textContent = '00:00';
      previewVideo.src = '';
      doneMeta.textContent = '—';
      showState('idle');
      return;
    }

    if (phase === 'starting') {
      showState('processing');
      return;
    }

    if (phase === 'recording') {
      recHintEl.textContent = captureSurfaceLabel
        ? `正在录制${captureSurfaceLabel}`
        : '录制进行中';
      showState('recording');
      return;
    }

    if (phase === 'paused') {
      pauseTimeEl.textContent = recTimeEl.textContent;
      showState('paused');
      return;
    }

    if (phase === 'processing') {
      showState('processing');
      return;
    }

    if (phase === 'done' && session) {
      previewVideo.src = session.blobUrl;
      previewVideo.load();
      doneMeta.textContent = session.summary || '录制完成';
      showState('done');
    }
  },
  onTimer({ elapsedMs, phase }) {
    const value = formatTime(elapsedMs);
    if (phase === 'paused') {
      pauseTimeEl.textContent = value;
      return;
    }
    recTimeEl.textContent = value;
  },
  onNotice({ type, message }) {
    setBanner(type, message);
  },
});

btnStart.addEventListener('click', () => {
  setBanner('', '');
  void controller.start();
});
btnPause.addEventListener('click', () => controller.pause());
btnStop.addEventListener('click', () => void controller.stop());
btnResume.addEventListener('click', () => controller.resume());
btnStopFromPause.addEventListener('click', () => void controller.stop());
btnDownload.addEventListener('click', () => controller.download());
btnReRecord.addEventListener('click', () => {
  setBanner('', '');
  controller.reset();
});
btnExpand.addEventListener('click', () => {
  const session = controller.getSession();
  if (session?.blobUrl) {
    chrome.tabs.create({ url: session.blobUrl });
  }
});

window.addEventListener('beforeunload', () => controller.destroy());

showState('idle');
