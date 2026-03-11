function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
}

function formatErrorMessage(error) {
  if (!error) return '录制启动失败，请重试。';
  if (error.name === 'NotAllowedError') return '你取消了屏幕共享，未开始录制。';
  if (error.name === 'AbortError') return '屏幕共享已取消，未开始录制。';
  if (error.name === 'NotFoundError') return '没有可用的录制来源。';
  if (error.name === 'NotReadableError') return '当前录制来源暂时不可用，请重试。';
  return '录制启动失败，请重新选择录制对象。';
}

function getShareSurfaceLabel(videoTrack) {
  const surface = videoTrack?.getSettings?.().displaySurface ?? '';
  if (surface === 'browser') return '标签页';
  if (surface === 'window') return '窗口';
  if (surface === 'monitor') return '整个屏幕';
  return '未识别来源';
}

function createEmptyInteractions() {
  return {
    clicks: [],
    cursor: [],
    viewport: { width: 1, height: 1 },
  };
}

function normalizeTargetTab(target) {
  if (typeof target === 'number' && Number.isInteger(target)) {
    return { id: target, url: '' };
  }
  if (target && Number.isInteger(target.id)) {
    return {
      id: target.id,
      url: typeof target.url === 'string' ? target.url : '',
    };
  }
  return { id: null, url: '' };
}

function isRestrictedPageUrl(url) {
  if (!url) return false;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chromewebstore://') ||
    url.includes('chrome.google.com/webstore')
  );
}

function getTrackingWarningMessage(targetTabUrl) {
  if (isRestrictedPageUrl(targetTabUrl)) {
    return '当前页面属于浏览器受限页面，无法采集点击和鼠标轨迹，但仍可正常录屏。';
  }
  return '已开始录制，但当前页面无法采集点击和鼠标轨迹。';
}

function makeSessionSummary(session) {
  const bits = [];
  if (Number.isFinite(session.durationMs) && session.durationMs > 0) {
    const totalSec = Math.floor(session.durationMs / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    bits.push(`${min}:${sec}`);
  }

  if (Number.isFinite(session.sizeBytes) && session.sizeBytes > 0) {
    bits.push(`${(session.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
  }

  if (session.captureSurfaceLabel) {
    bits.push(session.captureSurfaceLabel);
  }

  if (session.interactions?.clicks?.length) {
    bits.push(`${session.interactions.clicks.length} 次点击`);
  }

  if (!session.trackingAvailable) {
    bits.push('未采集交互数据');
  }

  return bits.join(' · ');
}

export function createRecorderController({
  resolveTargetTab,
  onPhaseChange,
  onTimer,
  onNotice,
  onSessionReady,
}) {
  const runtime = {
    phase: 'idle',
    mediaStream: null,
    mediaRecorder: null,
    chunks: [],
    timerId: null,
    startedAt: 0,
    pausedAt: 0,
    pausedTotal: 0,
    targetTabId: null,
    targetTabUrl: '',
    interactions: createEmptyInteractions(),
    session: null,
    stopReason: '',
    sourceBlobUrl: '',
    trackingAvailable: false,
  };

  function emitPhase(phase, extras = {}) {
    runtime.phase = phase;
    onPhaseChange?.({
      phase,
      session: runtime.session,
      ...extras,
    });
  }

  function emitNotice(type, message) {
    onNotice?.({ type, message });
  }

  function emitTimer() {
    const elapsedMs = runtime.startedAt ? Date.now() - runtime.startedAt - runtime.pausedTotal : 0;
    onTimer?.({
      elapsedMs: Math.max(0, elapsedMs),
      phase: runtime.phase,
    });
  }

  function startTick() {
    stopTick();
    runtime.timerId = window.setInterval(emitTimer, 200);
    emitTimer();
  }

  function stopTick() {
    if (runtime.timerId) {
      window.clearInterval(runtime.timerId);
      runtime.timerId = null;
    }
  }

  function revokeSourceUrl() {
    if (runtime.sourceBlobUrl) {
      URL.revokeObjectURL(runtime.sourceBlobUrl);
      runtime.sourceBlobUrl = '';
    }
  }

  function resetSessionState() {
    revokeSourceUrl();
    runtime.session = null;
    runtime.interactions = createEmptyInteractions();
    runtime.chunks = [];
    runtime.stopReason = '';
    runtime.trackingAvailable = false;
  }

  function sendMessageToTab(tabId, message) {
    if (!tabId) return Promise.resolve(null);
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response ?? null);
      });
    });
  }

  async function injectTrackingScript(tabId) {
    if (!tabId || !chrome.scripting?.executeScript) return false;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function startTracking() {
    if (!runtime.targetTabId) {
      runtime.interactions = createEmptyInteractions();
      return false;
    }
    let ping = await sendMessageToTab(runtime.targetTabId, { type: 'CURSORFUL_PING' });
    if (!ping?.ok && !isRestrictedPageUrl(runtime.targetTabUrl)) {
      const injected = await injectTrackingScript(runtime.targetTabId);
      if (injected) {
        ping = await sendMessageToTab(runtime.targetTabId, { type: 'CURSORFUL_PING' });
      }
    }
    if (!ping?.ok) {
      runtime.interactions = createEmptyInteractions();
      return false;
    }
    const response = await sendMessageToTab(runtime.targetTabId, { type: 'CURSORFUL_START_TRACKING' });
    runtime.interactions = createEmptyInteractions();
    return Boolean(response?.ok);
  }

  async function stopTracking() {
    if (!runtime.targetTabId) return createEmptyInteractions();
    const response = await sendMessageToTab(runtime.targetTabId, { type: 'CURSORFUL_STOP_TRACKING' });
    return response?.data ?? createEmptyInteractions();
  }

  function stopStreamTracks() {
    runtime.mediaStream?.getTracks().forEach(track => track.stop());
    runtime.mediaStream = null;
  }

  function finalizeRecording() {
    const mimeType = runtime.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(runtime.chunks, { type: mimeType });
    runtime.chunks = [];

    revokeSourceUrl();
    runtime.sourceBlobUrl = URL.createObjectURL(blob);

    const endedAt = Date.now();
    const durationMs = Math.max(0, endedAt - runtime.startedAt - runtime.pausedTotal);
    const videoTrack = runtime.mediaRecorder?.stream?.getVideoTracks?.()[0] ?? null;

    runtime.session = {
      blob,
      blobUrl: runtime.sourceBlobUrl,
      mimeType,
      sizeBytes: blob.size,
      durationMs,
      startedAt: runtime.startedAt,
      endedAt,
      targetTabId: runtime.targetTabId,
      captureSurfaceLabel: getShareSurfaceLabel(videoTrack),
      interactions: runtime.interactions,
      trackingAvailable: runtime.trackingAvailable,
      stopReason: runtime.stopReason,
      summary: '',
    };
    runtime.session.summary = makeSessionSummary(runtime.session);

    emitPhase('done', { session: runtime.session });
    onSessionReady?.(runtime.session);

    if (runtime.stopReason === 'share-ended') {
      emitNotice('warning', '屏幕共享已结束，已自动完成本次录制。');
    }
  }

  async function start() {
    if (runtime.phase === 'starting' || runtime.phase === 'recording' || runtime.phase === 'paused') return;

    resetSessionState();
    const targetTab = normalizeTargetTab(await resolveTargetTab());
    runtime.targetTabId = targetTab.id;
    runtime.targetTabUrl = targetTab.url;
    const trackingAvailable = await startTracking();
    runtime.trackingAvailable = trackingAvailable;

    emitPhase('starting', {
      trackingAvailable,
      message: '正在请求屏幕共享…',
    });

    try {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(window.screen.width * dpr);
      const height = Math.round(window.screen.height * dpr);

      runtime.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 60,
          width: { ideal: width, max: width },
          height: { ideal: height, max: height },
          resizeMode: 'none',
        },
        audio: true,
      });
    } catch (error) {
      await stopTracking();
      emitPhase('idle', { error: formatErrorMessage(error) });
      emitNotice('error', formatErrorMessage(error));
      return;
    }

    const mimeType = getSupportedMimeType();
    runtime.mediaRecorder = mimeType
      ? new MediaRecorder(runtime.mediaStream, { mimeType })
      : new MediaRecorder(runtime.mediaStream);

    runtime.chunks = [];
    runtime.startedAt = Date.now();
    runtime.pausedAt = 0;
    runtime.pausedTotal = 0;
    runtime.stopReason = '';

    runtime.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) runtime.chunks.push(event.data);
    };
    runtime.mediaRecorder.onstop = finalizeRecording;
    runtime.mediaRecorder.onerror = () => {
      emitNotice('error', '录制过程中发生错误，本次录制可能不完整。');
    };
    runtime.mediaRecorder.start(200);

    const [videoTrack] = runtime.mediaStream.getVideoTracks();
    videoTrack?.addEventListener('ended', () => {
      if (runtime.phase === 'recording' || runtime.phase === 'paused') {
        void stop({ reason: 'share-ended' });
      }
    });

    emitPhase('recording', {
      trackingAvailable,
      captureSurfaceLabel: getShareSurfaceLabel(videoTrack),
    });
    if (!trackingAvailable) {
      emitNotice('warning', getTrackingWarningMessage(runtime.targetTabUrl));
    }
    startTick();
  }

  function pause() {
    if (runtime.phase !== 'recording') return;
    runtime.mediaRecorder?.pause();
    runtime.pausedAt = Date.now();
    stopTick();
    emitPhase('paused');
    emitTimer();
  }

  function resume() {
    if (runtime.phase !== 'paused') return;
    runtime.pausedTotal += Date.now() - runtime.pausedAt;
    runtime.pausedAt = 0;
    runtime.mediaRecorder?.resume();
    emitPhase('recording');
    startTick();
  }

  async function stop({ reason = 'manual-stop' } = {}) {
    if (runtime.phase !== 'recording' && runtime.phase !== 'paused') return;

    stopTick();
    if (runtime.phase === 'paused' && runtime.pausedAt > 0) {
      runtime.pausedTotal += Date.now() - runtime.pausedAt;
      runtime.pausedAt = 0;
    }

    emitPhase('processing', { message: '正在整理录制结果…' });
    runtime.stopReason = reason;
    runtime.interactions = await stopTracking();

    if (runtime.mediaRecorder) {
      if (runtime.mediaRecorder.state === 'paused') {
        runtime.mediaRecorder.resume();
      }
      if (runtime.mediaRecorder.state !== 'inactive') {
        runtime.mediaRecorder.stop();
      }
    }

    stopStreamTracks();
  }

  function reset() {
    if (runtime.phase === 'recording' || runtime.phase === 'paused' || runtime.phase === 'processing') return;
    resetSessionState();
    runtime.startedAt = 0;
    runtime.pausedAt = 0;
    runtime.pausedTotal = 0;
    runtime.targetTabId = null;
    runtime.targetTabUrl = '';
    emitPhase('idle');
    emitTimer();
  }

  function download() {
    if (!runtime.session?.blobUrl) return;
    const ext = runtime.session.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const timestamp = new Date(runtime.session.startedAt || Date.now())
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-');
    const link = Object.assign(document.createElement('a'), {
      href: runtime.session.blobUrl,
      download: `cursorful-${timestamp}.${ext}`,
    });
    link.click();
  }

  function destroy() {
    stopTick();
    revokeSourceUrl();
  }

  return {
    start,
    pause,
    resume,
    stop,
    reset,
    download,
    destroy,
    getSession() {
      return runtime.session;
    },
    getPhase() {
      return runtime.phase;
    },
  };
}
